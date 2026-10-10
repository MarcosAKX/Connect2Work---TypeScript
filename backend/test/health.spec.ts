import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApplication } from '../src/application';
test('HTTP health and readiness expose only status and no business routes', async () => {
  let ready = false;
  const app = await createApplication({ async isReady() { return ready; } });
  try {
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    const health = await fetch(`${url}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    const down = await fetch(`${url}/ready`);
    assert.equal(down.status, 503);
    assert.deepEqual(await down.json(), { status: 'unavailable' });
    ready = true;
    const up = await fetch(`${url}/ready`);
    assert.equal(up.status, 200);
    assert.deepEqual(await up.json(), { status: 'ready' });
    assert.equal(up.headers.get('cache-control'), 'no-store');
    assert.equal(up.headers.get('x-powered-by'), null);
    assert.equal((await fetch(`${url}/usuarios`)).status, 404);
  } finally { await app.close(); }
});