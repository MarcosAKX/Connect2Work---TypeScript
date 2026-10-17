import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { CatalogoModule } from '../src/modules/catalogo.module';
import { ServicoUnidades } from '../src/services/servico-unidades';
const unit = { id: 'u1', name: 'Centro', address: 'Rua Central', availableRooms: 0, imageUrl: null };
test('unidades: sessão obrigatória, lista vazia, dados reais e falha sanitizada', async () => {
  let allowed = false; let fail = false; let empty = false; let reads = 0;
  const service = new ServicoUnidades({ async listar() { reads++; if (fail) throw new Error('SQL privado'); return empty ? [] : [unit]; } });
  const app = await NestFactory.create(CatalogoModule.register({ service, auth: { async consultar() { return allowed ? { user: {} } : null; } }, https: false }), { logger: false });
  await app.listen(0, '127.0.0.1');
  try {
    const url = await app.getUrl() + '/unidades';
    assert.equal((await fetch(url)).status, 401); assert.equal(reads, 0);
    allowed = true;
    const response = await fetch(url);
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), [unit]);
    empty = true; assert.deepEqual(await (await fetch(url)).json(), []);
    fail = true; const failed = await fetch(url);
    assert.equal(failed.status, 503); assert.ok(!(await failed.text()).includes('SQL privado'));
  } finally { await app.close(); }
});
