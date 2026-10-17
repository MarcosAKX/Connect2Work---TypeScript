import assert from 'node:assert/strict';
import { test } from 'node:test';
import { comConexaoLimitada } from '../src/database/conexao-limitada';
test('prazo integral destrói conexão travada e não a devolve ao pool', async () => {
  let destroyed = 0; let released = 0;
  const connection = { destroy() { destroyed++; }, release() { released++; } };
  await assert.rejects(comConexaoLimitada(async () => connection, async () => new Promise<never>(() => {}), 20), /Prazo/);
  assert.equal(destroyed, 1); assert.equal(released, 0);
});
test('aquisição pendente também tem prazo e conexão tardia é devolvida sem executar SQL', async () => {
  let release = 0; let calls = 0;
  let finish: ((value: { destroy(): void; release(): void }) => void) | undefined;
  const acquisition = new Promise<{ destroy(): void; release(): void }>(resolve => { finish = resolve; });
  await assert.rejects(comConexaoLimitada(() => acquisition, async () => { calls++; return true; }, 20), /Prazo/);
  assert.ok(finish);
  finish({ destroy() {}, release() { release++; } });
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  assert.equal(calls, 0); assert.equal(release, 1);
});
test('sucesso libera conexão e erro descarta sem reutilizar comandos pendentes', async () => {
  let releases = 0; let destroyed = 0;
  const connection = { destroy() { destroyed++; }, release() { releases++; } };
  assert.equal(await comConexaoLimitada(async () => connection, async () => 42, 100), 42);
  await assert.rejects(comConexaoLimitada(async () => connection, async () => { throw new Error('erro'); }, 100), /erro/);
  assert.equal(releases, 1); assert.equal(destroyed, 1);
});
