// Verificação local com IDs próprios; nunca usa tarefas reais como alvo.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPool, type RowDataPacket } from 'mysql2/promise';
import { validateEnvironment } from './config/environment';
import { buildPoolOptions } from './database/database.service';
import { RepositorioTarefasMysql } from './repositories/mysql/repositorio-tarefas-mysql';
import { TokenSessao } from './security/token-sessao';
import type { AtorAdministrativo } from './security/acesso-administrativo';
import type { CriacaoTarefa } from './dto/tarefa.dto';

async function check() {
  if (process.env.NODE_ENV === 'production') throw new Error('Somente validação local.');
  const config = validateEnvironment(process.env); const pool = createPool(buildPoolOptions(config.db));
  const repo = new RepositorioTarefasMysql(config.db);
  const adminId = randomUUID(), secretaryId = randomUUID(), clientId = randomUUID();
  const users = [adminId, secretaryId, clientId]; const ids: string[] = [];
  const adminToken = new TokenSessao().gerar(), secretaryToken = new TokenSessao().gerar();
  const admin: AtorAdministrativo = { id: adminId, name: 'Admin Teste Tarefas', role: 'admin', tokenHash: adminToken.hash };
  const secretary: AtorAdministrativo = { id: secretaryId, name: 'Equipe Teste Tarefas', role: 'secretaria', tokenHash: secretaryToken.hash };
  const duplicateAudit = randomUUID();
  const faulty = new RepositorioTarefasMysql(config.db, undefined, () => duplicateAudit);
  function input(dueDate: string | null = '2030-10-21'): CriacaoTarefa {
    const requestId = randomUUID(); ids.push(requestId);
    return { requestId, title: 'Tarefa Teste ' + requestId, description: '', priority: 'medium', assignedTo: secretaryId, dueDate };
  }
  try {
    for (const [id, role] of [[adminId, 'admin'], [secretaryId, 'secretaria'], [clientId, 'client']] as const) {
      await pool.execute('INSERT INTO usuarios(id,perfil_id,nome,email,ativo) SELECT ?,id,?,?,1 FROM perfis WHERE codigo=?', [id, 'Teste Tarefas', id + '@example.invalid', role]);
    }
    for (const [id, token] of [[adminId, adminToken.hash], [secretaryId, secretaryToken.hash]] as const) {
      await pool.execute('INSERT INTO sessoes(id,usuario_id,token_hash,criado_em,ultima_atividade_em,expira_em) VALUES(?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 4 HOUR))', [randomUUID(), id, token]);
    }
    const first = input(); const a = await repo.criar(admin, first);
    assert.equal(a.createdBy, adminId); assert.equal(a.dueDate, first.dueDate);
    assert.deepEqual(await repo.criar(admin, first), a);
    await assert.rejects(repo.criar(secretary, first), { status: 409 });
    const edited = await repo.alterar(secretary, a.id, { action: 'update', data: { title: 'Editada pela secretaria', description: 'Compartilhada', priority: 'high', assignedTo: adminId, expectedVersion: a.version } });
    assert.ok(edited); assert.equal(edited.title, 'Editada pela secretaria'); assert.equal(edited.dueDate, first.dueDate); assert.equal(edited.createdBy, adminId);
    await assert.rejects(repo.alterar(admin, a.id, { action: 'status', status: 'done', expectedVersion: a.version }), { status: 409 });
    const race = await Promise.allSettled([admin, secretary].map(actor => repo.alterar(actor, a.id, { action: 'status', status: 'in_progress', expectedVersion: edited.version })));
    assert.equal(race.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(race.filter(result => result.status === 'rejected').length, 1);
    const second = input(null); const b = await repo.criar(secretary, second);
    const changed = await repo.alterar(admin, b.id, { action: 'update', data: { title: 'Editada pelo admin', description: '', priority: 'low', assignedTo: secretaryId, expectedVersion: b.version } });
    assert.ok(changed); assert.equal(changed.dueDate, undefined); assert.equal(changed.createdBy, secretaryId);
    const mine = await repo.listar(secretary, { ownership: 'mine', page: 1, pageSize: 1 });
    assert.equal(mine.total, 1); assert.equal(mine.items.length, 1); assert.equal(mine.items[0]?.id, b.id);
    const people = await repo.equipe(); assert.ok(people.some(person => person.id === secretaryId)); assert.ok(!people.some(person => person.id === clientId)); assert.equal('email' in (people[0] ?? {}), false);
    await pool.execute("INSERT INTO registros_auditoria(id,usuario_id,acao,entidade,entidade_id) VALUES(?,?,'teste','task',?)", [duplicateAudit, adminId, a.id]);
    const rollback = input(); await assert.rejects(faulty.criar(admin, rollback), { status: 409 });
    const [absent] = await pool.execute<RowDataPacket[]>('SELECT id FROM tarefas WHERE id=?', [rollback.requestId]); assert.equal(absent.length, 0);
    await assert.rejects(faulty.alterar(admin, b.id, { action: 'update', data: { title: 'Não salvar', description: '', priority: 'low', assignedTo: null, expectedVersion: changed.version } }), { status: 409 });
    const after = await repo.listar(secretary, { ownership: 'mine', page: 1, pageSize: 10 }); assert.equal(after.items[0]?.title, 'Editada pelo admin'); assert.equal(after.items[0]?.version, changed.version);
    await assert.rejects(repo.criar(admin, { ...input(), assignedTo: clientId }), { status: 409 });
    await pool.execute('UPDATE usuarios SET ativo=0 WHERE id=?', [clientId]);
    await assert.rejects(repo.criar(admin, { ...input(), assignedTo: clientId }), { status: 409 });
    await repo.alterar(secretary, b.id, { action: 'delete', expectedVersion: changed.version });
    await assert.rejects(repo.criar(secretary, second), { status: 409 });
    await pool.execute('UPDATE sessoes SET revogado_em=UTC_TIMESTAMP(6) WHERE usuario_id=?', [secretaryId]);
    await assert.rejects(repo.criar(secretary, input()), { status: 401 });
    console.info('Tarefas MySQL: equipe compartilhada, prazo preservado, autoria, versões, concorrência, idempotência, paginação, rollback e sessão revogada OK.');
  } finally {
    for (const id of ids) { await pool.execute('DELETE FROM tarefas WHERE id=? AND criado_por IN (?,?)', [id, adminId, secretaryId]); await pool.execute("DELETE FROM registros_auditoria WHERE entidade='task' AND entidade_id=? AND usuario_id IN (?,?)", [id, adminId, secretaryId]); }
    await pool.execute('DELETE FROM registros_auditoria WHERE id=? AND usuario_id=?', [duplicateAudit, adminId]);
    for (const id of users) { await pool.execute('DELETE FROM sessoes WHERE usuario_id=?', [id]); await pool.execute('DELETE FROM usuarios WHERE id=?', [id]); }
    await repo.onModuleDestroy(); await faulty.onModuleDestroy(); await pool.end();
  }
}
check().catch(() => { console.error('Verificação de tarefas falhou; conferir código e fixtures locais.'); process.exitCode = 1; });
