import assert from 'node:assert/strict';
import { test } from 'node:test';
import { protecaoHttp } from '../src/security/protecao-http';

test('CSRF: todas as escritas exigem origem e cabeçalho, incluindo admin fora de auth', () => {
  const protect = protecaoHttp({ https: false, origins: ['http://localhost:5173'] });
  for (const url of ['/admin/usuarios', '/ADMIN/usuarios/?x=1', '/auth/login']) {
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      let next = false; let code = 0;
      const response = { status(value: number) { code = value; return this; }, json() {} };
      protect({ method, url, headers: {} }, response, () => { next = true; });
      assert.equal(next, false, method + url); assert.equal(code, 403);
      protect({ method, url, headers: { origin: 'http://localhost:5173', 'content-type': 'application/json', 'x-c2w-request': '1' } }, response, () => { next = true; });
      assert.equal(next, true);
    }
  }
});
test('multipart aceita até 10 MiB com margem de cabeçalhos e rejeita acima disso', () => {
  const protect = protecaoHttp({ https: false, origins: ['http://localhost:5173'] }); let passed = false; let code = 0;
  const response = { status(value: number) { code = value; return this; }, json() {} };
  const headers = { origin: 'http://localhost:5173', 'x-c2w-request': '1', 'content-type': 'multipart/form-data; boundary=teste', 'content-length': String(10 * 1024 * 1024 + 16384) };
  protect({ method: 'POST', url: '/admin/imagens', headers }, response, () => { passed = true; }); assert.equal(passed, true);
  passed = false; protect({ method: 'POST', url: '/admin/imagens', headers: { ...headers, 'content-length': String(10 * 1024 * 1024 + 16385) } }, response, () => { passed = true; }); assert.equal(passed, false); assert.equal(code, 413);
});
