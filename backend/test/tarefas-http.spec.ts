import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TarefasController, TAREFAS } from '../src/controllers/tarefas.controller';
import { COOKIE_ADMIN } from '../src/controllers/usuarios-administrativos.controller';
import { CookieSessao } from '../src/security/cookie-sessao';
import { TokenSessao } from '../src/security/token-sessao';
import { AcessoAdministrativo } from '../src/security/acesso-administrativo';
import { protecaoHttp } from '../src/security/protecao-http';
import { ServicoTarefas } from '../src/services/servico-tarefas';
import type { RepositorioTarefas } from '../src/repositories/contracts/repositorio-tarefas';
import type { Papel } from '../src/dto/usuario-gerenciado.dto';
@Module({}) class TestModule {}

test('HTTP tarefas autoriza equipe, nega cliente e impede adulteração do prazo e autor', async () => {
  const token = new TokenSessao().gerar().token;
  const actorId = randomUUID(), taskId = randomUUID(); const version = '2026-10-20 12:00:00.000001';
  let role: Papel = 'admin'; let logged = true; let active = true; let reads = 0, writes = 0;
  const item = { id: taskId, title: 'Tarefa de outra pessoa', priority: 'medium' as const, status: 'todo' as const, createdBy: randomUUID(), dueDate: '2026-10-21', createdAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-20T12:00:00Z', version };
  const access = new AcessoAdministrativo({ async consultar() { return logged ? { user: { id: actorId, name: 'Equipe', email: 'equipe@example.invalid', role, active, profession: '', phone: '', createdAt: item.createdAt, hasHoursPlan: false, hoursBalance: 0 }, idleExpiresAt: '', absoluteExpiresAt: '' } : null; } });
  const repo: RepositorioTarefas = {
    async listar(_actor, q) { reads++; return { items: [item], total: 1, page: q.page, pageSize: q.pageSize, counts: { todo: 1, in_progress: 0, done: 0 } }; },
    async equipe() { reads++; return [{ id: actorId, name: 'Equipe' }]; }, async atencao() { reads++; return 1; },
    async criar(actor) { writes++; return { ...item, createdBy: actor.id }; }, async alterar() { writes++; return item; },
  };
  const app = await NestFactory.create({ module: TestModule, controllers: [TarefasController], providers: [{ provide: TAREFAS, useValue: new ServicoTarefas(repo, access) }, { provide: COOKIE_ADMIN, useValue: new CookieSessao(false) }] }, { logger: false });
  app.use(protecaoHttp({ https: false, origins: ['http://localhost:5173'] }));
  await app.listen(0, '127.0.0.1');
  try {
    const url = await app.getUrl();
    const headers = { Cookie: 'c2w_session=' + token, Origin: 'http://localhost:5173', 'X-C2W-Request': '1', 'Content-Type': 'application/json' };
    const fields = { title: 'Editada', description: '', assignedTo: null, priority: 'high' };
    const write = (body: unknown, path = '/' + taskId, method = 'PATCH') => fetch(url + '/admin/tarefas' + path, { method, headers, body: JSON.stringify(body) });
    for (const permitted of ['admin', 'secretaria'] as const) {
      role = permitted;
      assert.equal((await fetch(url + '/admin/tarefas', { headers })).status, 200);
      const people = await fetch(url + '/admin/tarefas/equipe', { headers }); assert.equal(people.status, 200); assert.ok(!(await people.text()).includes('email'));
      assert.equal((await write({ ...fields, expectedVersion: version })).status, 200);
      for (const extra of [{ dueDate: '2030-01-01' }, { dueDate: null }, { createdBy: actorId }, { status: 'done' }]) assert.equal((await write({ ...fields, expectedVersion: version, ...extra })).status, 400);
      assert.equal((await write({ ...fields, requestId: randomUUID(), dueDate: '2026-10-21' }, '', 'POST')).status, 201);
      assert.equal((await write({ ...fields, requestId: randomUUID(), createdBy: actorId }, '', 'POST')).status, 400);
      assert.equal((await write({ status: 'done', expectedVersion: version }, '/' + taskId + '/situacao')).status, 200);
      assert.equal((await write({ expectedVersion: version }, '/' + taskId, 'DELETE')).status, 200);
    }
    const before = { reads, writes };
    role = 'client';
    assert.equal((await fetch(url + '/admin/tarefas', { headers })).status, 403);
    assert.equal((await write({ ...fields, expectedVersion: version })).status, 403);
    assert.equal((await fetch(url + '/admin/tarefas/equipe', { headers })).status, 403);
    logged = false; assert.equal((await fetch(url + '/admin/tarefas/atencao', { headers })).status, 401);
    logged = true; active = false; role = 'admin'; assert.equal((await write({ expectedVersion: version }, '/' + taskId, 'DELETE')).status, 401);
    assert.deepEqual({ reads, writes }, before);
    active = true;
    assert.equal((await fetch(url + '/admin/tarefas/' + taskId, { method: 'PATCH', headers: { ...headers, Origin: 'https://outro.invalid' }, body: JSON.stringify({ ...fields, expectedVersion: version }) })).status, 403);
  } finally { await app.close(); }
});
