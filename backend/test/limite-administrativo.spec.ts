import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LimiteAdministrativo } from '../src/security/limite-administrativo';
test('limite administrativo separa leitura/escrita e libera após janela sem descartar conta ativa', () => {
  let now = 0; const limiter = new LimiteAdministrativo({ agora() { return new Date(now); } });
  for (let i = 0; i < 30; i++) limiter.verificar('admin', true);
  assert.throws(() => limiter.verificar('admin', true), { status: 429 });
  for (let i = 0; i < 120; i++) limiter.verificar('admin', false);
  assert.throws(() => limiter.verificar('admin', false), { status: 429 });
  for (let i = 0; i < 999; i++) limiter.verificar('conta-' + i, false);
  assert.throws(() => limiter.verificar('excedente', false), { status: 429 });
  assert.throws(() => limiter.verificar('admin', true), { status: 429 });
  now = 60000; limiter.verificar('admin', true); limiter.verificar('excedente', false);
});
