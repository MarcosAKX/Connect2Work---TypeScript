import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { CatalogoModule } from '../src/modules/catalogo.module';
import { ServicoUnidades } from '../src/services/servico-unidades';
import { ServicoSalas } from '../src/services/servico-salas';
const unitId = 'e9c833f0-2af0-4c34-977a-6d4f8b2c3001';
const roomId = 'eb6be390-1a5a-4581-831f-6bfca96a1001';
const room = { id: roomId, unitId, name: 'Sala', capacity: 4, pricePerHour: 50, amenities: ['Wi-Fi'], imageUrl: null };
test('salas: sessão, filtro por unidade, detalhe, lista vazia e erros sanitizados', async () => {
  let allowed = false; let failure = false; let empty = false; const ids: string[] = [];
  const salas = new ServicoSalas({ async listarPorUnidade(id) { ids.push(id); if (failure) throw new Error('SQL privado'); return empty ? [] : [room]; },
    async buscarPorId(id) { return id === roomId ? room : null; } });
  const app = await NestFactory.create(CatalogoModule.register({ service: new ServicoUnidades({ async listar() { return []; } }),
    auth: { async consultar() { return allowed ? {} : null; } }, https: false, salas: { service: salas } }), { logger: false });
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl(); const url = base + '/unidades/' + unitId + '/salas';
    assert.equal((await fetch(url)).status, 401); assert.deepEqual(ids, []);
    assert.equal((await fetch(base + '/salas/' + roomId)).status, 401);
    allowed = true; const response = await fetch(url);
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), [room]); assert.deepEqual(ids, [unitId]);
    assert.deepEqual(await (await fetch(base + '/salas/' + roomId)).json(), room);
    assert.equal((await fetch(base + '/salas/' + unitId)).status, 404);
    assert.equal((await fetch(base + '/unidades/invalido/salas')).status, 400); assert.equal(ids.length, 1);
    empty = true; assert.deepEqual(await (await fetch(url)).json(), []);
    failure = true; const failed = await fetch(url); assert.equal(failed.status, 503); assert.ok(!(await failed.text()).includes('SQL privado'));
  } finally { await app.close(); }
});
