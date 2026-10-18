import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { ServicoUsuariosAdministrativos } from '../src/services/servico-usuarios-administrativos';
import { AcessoAdministrativo } from '../src/security/acesso-administrativo';
import { TokenSessao } from '../src/security/token-sessao';
import type { RepositorioUsuariosAdministrativos, OperacaoUsuario } from '../src/repositories/contracts/repositorio-usuarios-administrativos';
import type { UsuarioGerenciadoDto } from '../src/dto/usuario-gerenciado.dto';
const actorId = randomUUID();
const token = new TokenSessao().gerar().token;
const user: UsuarioGerenciadoDto = { id: actorId, name: 'Admin Teste', email: 'admin@example.invalid', profession: '', phone: '', role: 'admin', active: true, createdAt: '2026-10-18T12:00:00.000Z', version: '2026-10-18 12:00:00.000001', hasHoursPlan: false, hoursBalance: 0 };
const input = { name: 'Maria Teste', email: 'MARIA@EXAMPLE.INVALID', profession: '', phone: '', password: 'senha123', role: 'client', active: true };
function setup() {
  let role: 'admin' | 'client' | 'secretaria' = 'admin'; let logged = true; const writes: OperacaoUsuario[] = []; const passwords: string[] = [];
  const repo: RepositorioUsuariosAdministrativos = {
    async listar() { return { items: [user], page: 1, pageSize: 50, total: 1, summary: { total: 1, active: 1, inactive: 0, admin: 1, client: 0, secretaria: 0 } }; },
    async gravar(_ator, operation) { writes.push(operation); return user; },
    async equipe() { return [{ id: actorId, name: user.name }]; }, async clientes() { return []; }
  };
  const acesso = new AcessoAdministrativo({ async consultar() { return logged ? { user: { ...user, role }, idleExpiresAt: '2026-10-18T12:15:00Z', absoluteExpiresAt: '2026-10-18T16:00:00Z' } : null; } });
  const service = new ServicoUsuariosAdministrativos(repo, acesso, { async gerar(password) { passwords.push(password); return 'argon-hash'; } });
  return { service, writes, passwords, role(value: typeof role) { role = value; }, logout() { logged = false; } };
}
test('admin usuários: cliente e secretaria não listam/gravam contas; ausência de sessão nega', async () => {
  const s = setup();
  for (const role of ['client', 'secretaria'] as const) {
    s.role(role); await assert.rejects(s.service.listar(token, {}), { status: 403 }); await assert.rejects(s.service.criar(token, input), { status: 403 });
  }
  s.logout(); await assert.rejects(s.service.listar(token, {}), { status: 401 }); assert.equal(s.writes.length, 0);
});
test('admin usuários: campos adulterados, números Unicode, senha com espaço e paginação inválida são negados antes do hash', async () => {
  const s = setup();
  for (const invalid of [{ ...input, actorUserId: actorId }, { ...input, name: 'Maria ²' }, { ...input, profession: 'Dev1' }, { ...input, active: 'false' }, { ...input, phone: 'letras11987654321' }, { ...input, password: 'a'.repeat(130) + ' ' }]) {
    await assert.rejects(s.service.criar(token, invalid), { status: 400 });
  }
  for (const query of [{ page: '0' }, { pageSize: '101' }, { active: 'yes' }, { role: 'root' }, { foo: 'x' }]) await assert.rejects(s.service.listar(token, query), { status: 400 });
  assert.equal(s.passwords.length, 0);
});
test('admin usuários: normaliza e-mail e limita senha a 128; atualização sem senha não gera hash', async () => {
  const s = setup(); await s.service.criar(token, { ...input, password: 'a'.repeat(130) });
  assert.equal(s.passwords[0]?.length, 128); const created = s.writes[0]; assert.equal(created?.kind, 'create');
  if (created?.kind === 'create') { assert.equal(created.data.email, 'maria@example.invalid'); assert.equal(created.data.senhaHash, 'argon-hash'); assert.ok(!('password' in created.data)); }
  const { password: _password, ...update } = input;
  await s.service.atualizar(token, randomUUID(), { ...update, expectedVersion: user.version }); assert.equal(s.passwords.length, 1);
  await assert.rejects(s.service.atualizar(token, randomUUID(), { ...update, expectedVersion: user.version, password: '' }), { status: 400 });
});
test('admin usuários: autoproteção também no formulário completo e nas ações específicas', async () => {
  const s = setup(); const { password: _password, ...update } = input;
  for (const body of [{ ...update, role: 'client' }, { ...update, role: 'admin', active: false }]) await assert.rejects(s.service.atualizar(token, actorId, { ...body, expectedVersion: user.version }), { status: 409 });
  await assert.rejects(s.service.alterarPerfil(token, actorId, { role: 'client', expectedVersion: user.version }), { status: 409 });
  await assert.rejects(s.service.alterarStatus(token, actorId, { active: false, expectedVersion: user.version }), { status: 409 });
  assert.equal(s.writes.length, 0);
});
