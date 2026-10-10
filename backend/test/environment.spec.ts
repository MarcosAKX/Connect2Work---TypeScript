import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateEnvironment } from '../src/config/environment';
const valid = { DB_HOST: '127.0.0.1', DB_PORT: '3306', DB_NAME: 'connect2work', DB_USER: 'c2w_api', DB_PASSWORD: 'fake-test-password', PORT: '3001' };
test('validates defaults and preserves password literally', () => {
  const config = validateEnvironment({ ...valid, DB_PASSWORD: ' space # $ literal ' });
  assert.equal(config.db.password, ' space # $ literal ');
  assert.equal(config.port, 3001);
  assert.equal(config.host, '127.0.0.1');
});
test('rejects missing password without leaking other configuration', () => {
  assert.throws(() => validateEnvironment({ ...valid, DB_PASSWORD: '' }), { message: 'Configuração inválida: DB_PASSWORD.' });
});
test('rejects malformed ports', () => {
  for (const port of ['0', '65536', '3001oops', '1.5', '-1']) {
    assert.throws(() => validateEnvironment({ ...valid, PORT: port }));
    assert.throws(() => validateEnvironment({ ...valid, DB_PORT: port }));
  }
});
test('rejects root and remote database hosts for the local foundation', () => {
  assert.throws(() => validateEnvironment({ ...valid, DB_USER: 'root' }));
  assert.throws(() => validateEnvironment({ ...valid, DB_HOST: '0.0.0.0' }));
});