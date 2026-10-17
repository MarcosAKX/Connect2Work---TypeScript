import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConflictException } from '@nestjs/common';
import { createApplication } from '../src/application';
import { ServicoCadastro } from '../src/services/servico-cadastro';
const input = { name: 'Maria Silva', email: 'maria@example.com', profession: 'Designer', phone: '11987654321', password: 'abc123' };
test('HTTP cadastro retorna 201 sem segredo, valida entrada e sanitiza falhas', async () => {
  let failure: 'none' | 'duplicate' | 'private' = 'none';
  const service = new ServicoCadastro({ async criar() {
    if (failure === 'duplicate') throw new ConflictException('Nao foi possivel cadastrar com esse e-mail.');
    if (failure === 'private') throw new Error('segredo-interno');
  } }, { async gerar() { return 'hash-privado'; } });
  const app = await createApplication({ async isReady() { return true; } }, { service });
  try {
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    async function post(body: unknown) { return fetch(`${url}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    const success = await post(input);
    assert.equal(success.status, 201);
    const data = await success.text();
    assert.ok(data.includes('client'));
    assert.ok(!data.includes('abc123') && !data.includes('hash-privado'));
    assert.equal((await post({ ...input, role: 'admin' })).status, 400);
    assert.equal((await post({ ...input, password: 'abc 123' })).status, 400);
    failure = 'duplicate';
    assert.equal((await post(input)).status, 409);
    failure = 'private';
    const unavailable = await post(input);
    assert.equal(unavailable.status, 503);
    assert.ok(!(await unavailable.text()).includes('segredo-interno'));
    const malformed = await fetch(`${url}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    const oversized = await post({ ...input, name: 'a'.repeat(20000) });
    assert.equal(oversized.status, 413);
  } finally { await app.close(); }
});
test('limita tentativas repetidas de cadastro nesta instancia', async () => {
  const service = new ServicoCadastro({ async criar() {} }, { async gerar() { return 'hash'; } });
  const app = await createApplication({ async isReady() { return true; } }, { service });
  try {
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    for (let i = 0; i < 12; i++) {
      assert.equal((await fetch(`${url}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 400);
    }
    assert.equal((await fetch(`${url}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 429);
  } finally { await app.close(); }
});