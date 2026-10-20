import { ConflictException, NotFoundException, type OnModuleDestroy } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { createPool, type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import type { DatabaseConfig } from '../../config/environment';
import { buildPoolOptions } from '../../database/database.service';
import { bancoAdministrativo } from './banco-administrativo';
import { bloquearAcessoAdministrativo } from '../../security/transacao-administrativa';
import type { AtorAdministrativo } from '../../security/acesso-administrativo';
import { RelogioSistema, type Relogio } from '../../security/relogio';
import { dataComercial } from '../../domain/horario-comercial';
import type { CriacaoTarefa, ConsultaTarefas, PaginaTarefas, PessoaEquipe, TarefaDto, SituacaoTarefa, PrioridadeTarefa } from '../../dto/tarefa.dto';
import type { RepositorioTarefas, AlteracaoTarefa } from '../contracts/repositorio-tarefas';

interface Row extends RowDataPacket {
  id: string; titulo: string; descricao: string | null; situacao: string; prioridade: string;
  prazo_iso: string | null; responsavel_id: string | null; criado_por: string;
  criado_em: Date; atualizado_em: Date; versao: string;
}
interface Counts extends RowDataPacket { total: number; todo: string | null; in_progress: string | null; done: string | null; }
const estados: Record<SituacaoTarefa, string> = { todo: 'a_fazer', in_progress: 'em_andamento', done: 'concluida' };
const prioridades: Record<PrioridadeTarefa, string> = { low: 'baixa', medium: 'media', high: 'alta' };
const SELECT = "SELECT *,DATE_FORMAT(prazo,'%Y-%m-%d') prazo_iso,DATE_FORMAT(atualizado_em,'%Y-%m-%d %H:%i:%s.%f') versao FROM tarefas";
function dto(row: Row): TarefaDto {
  const status = row.situacao === 'a_fazer' ? 'todo' : row.situacao === 'em_andamento' ? 'in_progress' : row.situacao === 'concluida' ? 'done' : null;
  const priority = row.prioridade === 'baixa' ? 'low' : row.prioridade === 'media' ? 'medium' : row.prioridade === 'alta' ? 'high' : null;
  if (!status || !priority) throw new Error('Estado de tarefa inválido.');
  return { id: row.id, title: row.titulo, ...(row.descricao ? { description: row.descricao } : {}),
    ...(row.responsavel_id ? { assignedTo: row.responsavel_id } : {}), ...(row.prazo_iso ? { dueDate: row.prazo_iso } : {}),
    status, priority, createdBy: row.criado_por, createdAt: row.criado_em.toISOString(), updatedAt: row.atualizado_em.toISOString(), version: row.versao };
}
export class RepositorioTarefasMysql implements RepositorioTarefas, OnModuleDestroy {
  private readonly pool: Pool;
  constructor(config: DatabaseConfig, private readonly clock: Relogio = new RelogioSistema(), private readonly auditId: () => string = randomUUID) {
    this.pool = createPool(buildPoolOptions(config));
  }
  async listar(actor: AtorAdministrativo, query: ConsultaTarefas): Promise<PaginaTarefas> {
    return bancoAdministrativo(this.pool, async c => {
      await c.beginTransaction();
      try {
        const where = query.ownership === 'mine' ? 'responsavel_id=?' : '1=1';
        const params = query.ownership === 'mine' ? [actor.id] : [];
        const [counts] = await c.execute<Counts[]>({ sql: "SELECT COUNT(*) total,SUM(situacao='a_fazer') todo,SUM(situacao='em_andamento') in_progress,SUM(situacao='concluida') done FROM tarefas WHERE " + where, timeout: 2000 }, params);
        const [rows] = await c.execute<Row[]>({ sql: SELECT + ' WHERE ' + where + ` ORDER BY criado_em DESC,id DESC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`, timeout: 2000 }, params);
        const countsRow = counts[0]; if (!countsRow) throw new Error('Contagem ausente.');
        await c.commit();
        return { items: rows.map(dto), total: Number(countsRow.total), page: query.page, pageSize: query.pageSize,
          counts: { todo: Number(countsRow.todo ?? 0), in_progress: Number(countsRow.in_progress ?? 0), done: Number(countsRow.done ?? 0) } };
      } catch (error: unknown) { await c.rollback(); throw error; }
    });
  }
  async equipe(): Promise<PessoaEquipe[]> {
    return bancoAdministrativo(this.pool, async c => {
      const [rows] = await c.execute<(RowDataPacket & PessoaEquipe)[]>({ sql: "SELECT u.id,u.nome name FROM usuarios u JOIN perfis p ON p.id=u.perfil_id WHERE u.ativo=1 AND p.codigo IN ('admin','secretaria') ORDER BY u.nome,u.id LIMIT 501", timeout: 2000 });
      if (rows.length > 500) throw new ConflictException('Equipe excede o limite de seleção.');
      return rows.map(row => ({ id: row.id, name: row.name }));
    });
  }
  async atencao(): Promise<number> {
    return bancoAdministrativo(this.pool, async c => {
      const [rows] = await c.execute<(RowDataPacket & { total: number })[]>({ sql: "SELECT COUNT(*) total FROM tarefas WHERE situacao<>'concluida' AND prazo<=?", timeout: 2000 }, [dataComercial(this.clock.agora())]);
      return Number(rows[0]?.total ?? 0);
    });
  }
  private async row(c: PoolConnection, id: string, lock = false): Promise<Row | undefined> {
    const [rows] = await c.execute<Row[]>({ sql: SELECT + ' WHERE id=?' + (lock ? ' FOR UPDATE' : ''), timeout: 2000 }, [id]); return rows[0];
  }
  private async responsavel(c: PoolConnection, id: string | null): Promise<void> {
    if (!id) return;
    const [rows] = await c.execute<RowDataPacket[]>({ sql: "SELECT u.id FROM usuarios u JOIN perfis p ON p.id=u.perfil_id WHERE u.id=? AND u.ativo=1 AND p.codigo IN ('admin','secretaria')", timeout: 2000 }, [id]);
    if (!rows.length) throw new ConflictException('Selecione uma pessoa ativa da equipe.');
  }
  private async audit(c: PoolConnection, actor: { id: string; name: string }, id: string, action: string, details: object, now: Date) {
    await c.execute('INSERT INTO registros_auditoria(id,usuario_id,nome_usuario,acao,entidade,entidade_id,detalhes,ocorrido_em) VALUES(?,?,?,?,?,?,?,?)',
      [this.auditId(), actor.id, actor.name, action, 'task', id, JSON.stringify(details), now]);
  }
  async criar(actor: AtorAdministrativo, input: CriacaoTarefa): Promise<TarefaDto> {
    return bancoAdministrativo(this.pool, async c => {
      await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'); await c.beginTransaction();
      try {
        const access = await bloquearAcessoAdministrativo(c, actor, this.clock, input.assignedTo ? [input.assignedTo] : [], ['admin', 'secretaria']);
        const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
        const existing = await this.row(c, input.requestId, true);
        const [history] = await c.execute<RowDataPacket[]>("SELECT usuario_id,JSON_UNQUOTE(JSON_EXTRACT(detalhes,'$.fingerprint')) fingerprint FROM registros_auditoria WHERE entidade='task' AND entidade_id=? AND acao='create' LIMIT 1", [input.requestId]);
        if (existing) {
          if (history[0]?.usuario_id !== actor.id || history[0]?.fingerprint !== fingerprint) throw new ConflictException('Identificador já utilizado.');
          await c.commit(); return dto(existing);
        }
        if (history.length) throw new ConflictException('Criação já concluída; tarefa removida. Atualize o quadro.');
        await this.responsavel(c, input.assignedTo);
        await c.execute('INSERT INTO tarefas(id,titulo,descricao,situacao,prioridade,prazo,responsavel_id,criado_por,criado_em,atualizado_em) VALUES(?,?,?,?,?,?,?,?,?,?)',
          [input.requestId, input.title, input.description || null, 'a_fazer', prioridades[input.priority], input.dueDate, input.assignedTo, access.id, access.agora, access.agora]);
        await this.audit(c, access, input.requestId, 'create', { source: 'equipe', fingerprint }, access.agora);
        const created = await this.row(c, input.requestId); if (!created) throw new Error('Tarefa ausente.');
        await c.commit(); return dto(created);
      } catch (error: unknown) { await c.rollback(); throw error; }
    });
  }
  async alterar(actor: AtorAdministrativo, id: string, change: AlteracaoTarefa): Promise<TarefaDto | null> {
    return bancoAdministrativo(this.pool, async c => {
      await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'); await c.beginTransaction();
      try {
        const assigned = change.action === 'update' ? change.data.assignedTo : null;
        const access = await bloquearAcessoAdministrativo(c, actor, this.clock, assigned ? [assigned] : [], ['admin', 'secretaria']);
        const current = await this.row(c, id, true); if (!current) throw new NotFoundException('Tarefa não encontrada.');
        const expected = change.action === 'update' ? change.data.expectedVersion : change.expectedVersion;
        if (current.versao !== expected) throw new ConflictException('Tarefa alterada por outra pessoa. Atualize o quadro.');
        if (change.action === 'delete') {
          await c.execute('DELETE FROM tarefas WHERE id=?', [id]);
        } else if (change.action === 'status') {
          await c.execute('UPDATE tarefas SET situacao=?,atualizado_em=GREATEST(?,DATE_ADD(atualizado_em,INTERVAL 1 MICROSECOND)) WHERE id=?', [estados[change.status], access.agora, id]);
        } else {
          await this.responsavel(c, assigned);
          // Prazo e autor são imutáveis, inclusive para administradores.
          await c.execute('UPDATE tarefas SET titulo=?,descricao=?,prioridade=?,responsavel_id=?,atualizado_em=GREATEST(?,DATE_ADD(atualizado_em,INTERVAL 1 MICROSECOND)) WHERE id=?',
            [change.data.title, change.data.description || null, prioridades[change.data.priority], assigned, access.agora, id]);
        }
        await this.audit(c, access, id, change.action === 'delete' ? 'delete' : 'update', { source: 'equipe', ...(change.action === 'status' ? { status: change.status } : {}) }, access.agora);
        const updated = change.action === 'delete' ? null : await this.row(c, id);
        if (change.action !== 'delete' && !updated) throw new Error('Tarefa ausente.');
        await c.commit(); return updated ? dto(updated) : null;
      } catch (error: unknown) { await c.rollback(); throw error; }
    });
  }
  async onModuleDestroy() { await this.pool.end(); }
}
