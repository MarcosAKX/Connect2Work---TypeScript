import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { AdministracaoModule } from '../src/modules/administracao.module';
import { ServicoUsuariosAdministrativos } from '../src/services/servico-usuarios-administrativos';
import { AcessoAdministrativo } from '../src/security/acesso-administrativo';
import { TokenSessao } from '../src/security/token-sessao';
test('HTTP admin: sessão, papel e transporte sem credenciais', async () => {
  let role: 'admin' | 'client' | 'secretaria' = 'admin'; let logged = false;
  const token = new TokenSessao().gerar().token;
  const user = { id: 'a4e19365-9c4e-47b7-951f-1d7049491325', name: 'Admin Teste', email: 'a@example.invalid', profession: '', phone: '', active: true, createdAt: new Date().toISOString(), role: 'admin' as const, hasHoursPlan: false, hoursBalance: 0 };
  const service = new ServicoUsuariosAdministrativos({ async listar(q) { return { items: [], total: 0, page: q.page, pageSize: q.pageSize, summary: { total: 0, active: 0, inactive: 0, admin: 0, client: 0, secretaria: 0 } }; }, async gravar() { return { ...user, version: '2026-10-18 12:00:00.000001' }; }, async equipe() { return [{ id: user.id, name: user.name }]; }, async clientes() { return []; } },
    new AcessoAdministrativo({ async consultar() { return logged ? { user: { ...user, role }, idleExpiresAt: new Date().toISOString(), absoluteExpiresAt: new Date().toISOString() } : null; } }), { async gerar() { return 'hash'; } });
  const app = await NestFactory.create(AdministracaoModule.register({ service, https: false }), { logger: false }); await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl(); const headers = { Cookie: 'c2w_session=' + token };
    assert.equal((await fetch(base + '/admin/usuarios', { headers })).status, 401); logged = true;
    for (const next of ['client', 'secretaria'] as const) { role = next; assert.equal((await fetch(base + '/admin/usuarios', { headers })).status, 403); }
    role = 'admin'; const response = await fetch(base + '/admin/usuarios?page=2&pageSize=10', { headers }); assert.equal(response.status, 200);
    const body: unknown = await response.json(); assert.ok(body && typeof body === 'object' && 'page' in body); assert.equal(body.page, 2); assert.ok(!JSON.stringify(body).includes('hash'));
    role = 'secretaria'; assert.equal((await fetch(base + '/admin/equipe', { headers })).status, 200);
  } finally { await app.close(); }
});
