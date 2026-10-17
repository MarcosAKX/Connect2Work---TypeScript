import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ServicoSessoes } from '../src/services/servico-sessoes';
import { TokenSessao } from '../src/security/token-sessao';
import type { RepositorioSessoes, SessaoValida } from '../src/repositories/contracts/repositorio-sessoes';
class Memoria implements RepositorioSessoes {
  rows = new Map<string, SessaoValida>();
  async criar(usuarioId: string, hash: Buffer, agora: Date, expiraEm: Date, anterior: Buffer | null) {
    if (anterior) this.rows.delete(anterior.toString('hex'));
    this.rows.set(hash.toString('hex'), { usuarioId, ultimaAtividadeEm: agora, expiraEm });
  }
  async consultar(hash: Buffer, agora: Date) {
    const row = this.rows.get(hash.toString('hex'));
    return row && agora < row.expiraEm && agora.getTime() - row.ultimaAtividadeEm.getTime() < 900000 && agora >= row.ultimaAtividadeEm ? { ...row } : null;
  }
  async registrarAtividade(hash: Buffer, agora: Date) {
    const row = await this.consultar(hash, agora);
    if (row) { row.ultimaAtividadeEm = agora; this.rows.set(hash.toString('hex'), row); }
    return row;
  }
  async revogar(hash: Buffer) { this.rows.delete(hash.toString('hex')); }
}
test('limites exatos: 15 minutos ociosos e 4 horas absolutas, GET nao renova', async () => {
  let now = new Date('2026-10-11T12:00:00Z');
  const inicio = now.getTime();
  const repo = new Memoria();
  const service = new ServicoSessoes(repo, { agora: () => now });
  const created = await service.criar('usuario', null);
  assert.equal(created.sessao.expiraEm.getTime(), inicio + 14400000);
  now = new Date(inicio + 899999);
  assert.ok(await service.consultar(created.token));
  now = new Date(inicio + 900000);
  assert.equal(await service.consultar(created.token), null);
  now = new Date(inicio);
  const active = await service.criar('usuario', null);
  for (let elapsed = 600000; elapsed < 14400000; elapsed += 600000) {
    now = new Date(inicio + elapsed);
    assert.ok(await service.registrarAtividade(active.token));
  }
  now = new Date(inicio + 14400000);
  assert.equal(await service.registrarAtividade(active.token), null);
});
test('token aleatorio, hash somente, rotacao, revogacao e entradas malformadas', async () => {
  const repo = new Memoria();
  const service = new ServicoSessoes(repo);
  const first = await service.criar('usuario', null);
  assert.match(first.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(new TokenSessao().hash(first.token)?.length, 32);
  assert.ok(!JSON.stringify([...repo.rows]).includes(first.token));
  const second = await service.criar('usuario', first.token);
  assert.notEqual(first.token, second.token);
  assert.equal(await service.consultar(first.token), null);
  await service.revogar(second.token);
  assert.equal(await service.registrarAtividade(second.token), null);
  for (const value of [null, '', 'x'.repeat(44), '!'.repeat(43)]) assert.equal(await service.consultar(value), null);
  assert.equal(new TokenSessao().hash('a'.repeat(43)), null);
});
