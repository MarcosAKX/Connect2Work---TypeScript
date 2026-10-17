import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { PoliticaSenha } from '../src/security/politica-senha';
import { ServicoAutenticacao } from '../src/services/servico-autenticacao';
import { ServicoSessoes } from '../src/services/servico-sessoes';
import type { RepositorioSessoes, SessaoValida } from '../src/repositories/contracts/repositorio-sessoes';
import type { UsuarioPublicoDto } from '../src/dto/usuario-publico.dto';
import { ServicoSenha } from '../src/security/servico-senha-argon2';
const publicUser: UsuarioPublicoDto = { id: 'user', name: 'Maria Silva', email: 'maria@example.com', profession: 'Designer', phone: '11987654321', role: 'client', active: true, createdAt: '2026-10-11T12:00:00.000Z', hasHoursPlan: false, hoursBalance: 0 };
function setup() {
  let user: UsuarioPublicoDto | null = { ...publicUser };
  let hash: string | null = 'real-hash';
  let capturedPassword = '';
  let capturedHash = '';
  let row: SessaoValida | null = null;
  const repo: RepositorioSessoes = {
    async criar(usuarioId, _hash, ultimaAtividadeEm, expiraEm) { row = { usuarioId, ultimaAtividadeEm, expiraEm }; },
    async consultar() { return row; }, async registrarAtividade() { return row; }, async revogar() { row = null; }
  };
  const service = new ServicoAutenticacao({
    async buscarCredenciais() { return user ? { usuario: { ...user }, senhaHash: hash } : null; },
    async buscarPublico() { return user ? { ...user } : null; }
  }, {
    async verificar(selectedHash, senha) { capturedHash = selectedHash; capturedPassword = senha; return selectedHash === 'real-hash' && senha === 'a'.repeat(128); }
  }, new ServicoSessoes(repo), 'dummy-hash');
  return { service, setUser(value: UsuarioPublicoDto | null) { user = value; }, setHash(value: string | null) { hash = value; }, captured: () => ({ capturedPassword, capturedHash }) };
}
test('senha trunca antes do hash mas rejeita espaços no valor completo e não aplica trim', () => {
  const policy = new PoliticaSenha();
  assert.equal(policy.normalizar('a'.repeat(130)), 'a'.repeat(128));
  assert.throws(() => policy.normalizar('a'.repeat(128) + ' '));
  assert.throws(() => policy.normalizar(' abc123'));
  assert.throws(() => policy.normalizar('12345'));
});
test('login usa prefixo128 e DTO público, GET mostra perfil atual e inativo revoga', async () => {
  const fixture = setup();
  const login = await fixture.service.login({ email: ' MARIA@example.com ', password: 'a'.repeat(128) + 'zz' }, null);
  assert.equal(fixture.captured().capturedPassword.length, 128);
  assert.equal(login.resposta.user.role, 'client');
  assert.ok(!JSON.stringify(login.resposta).includes('real-hash'));
  fixture.setUser({ ...publicUser, role: 'secretaria' });
  assert.equal((await fixture.service.consultar(login.token))?.user.role, 'secretaria');
  fixture.setUser({ ...publicUser, active: false });
  assert.equal(await fixture.service.consultar(login.token), null);
  fixture.setUser(publicUser);
  assert.equal(await fixture.service.consultar(login.token), null);
});
test('credenciais incorretas, conta ausente, inativa e hash nulo têm mesma resposta', async () => {
  for (const scenario of ['missing', 'inactive', 'nullhash', 'wrong', 'extra', 'space']) {
    const fixture = setup();
    if (scenario === 'missing') fixture.setUser(null);
    if (scenario === 'inactive') fixture.setUser({ ...publicUser, active: false });
    if (scenario === 'nullhash') fixture.setHash(null);
    let input: unknown = { email: publicUser.email, password: 'wrong123' };
    if (scenario === 'extra') input = { email: publicUser.email, password: 'a'.repeat(128), role: 'admin' };
    if (scenario === 'space') input = { email: publicUser.email, password: 'a'.repeat(128) + ' ' };
    await assert.rejects(fixture.service.login(input, null), error => error instanceof UnauthorizedException && error.message === 'Senha incorreta');
    if (scenario === 'missing' || scenario === 'nullhash') assert.equal(fixture.captured().capturedHash, 'dummy-hash');
  }
});
test('verificacao Argon2 usa hash correto, falha fechada em hash malformado', async () => {
  const password = new ServicoSenha();
  const hash = await password.gerar('abc123');
  assert.equal(await password.verificar(hash, 'abc123'), true);
  assert.equal(await password.verificar(hash, 'abc124'), false);
  assert.equal(await password.verificar('corrompido', 'abc123'), false);
});
