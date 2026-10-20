import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CloudinaryImagens, type TransporteCloudinary } from '../src/storage/cloudinary-imagens';
import { validarConfigCloudinary } from '../src/config/cloudinary-environment';
const id = 'd82919bb-ec6d-45c1-a19e-3ac1b804cb21';
const temp = 'connect2work/local/temporarios/' + id; const key = 'connect2work/local/catalogo/' + id;
const config = { cloudName: 'teste', apiKey: '123', apiSecret: 'nao-real', namespace: 'connect2work/local' };
function setup() {
  let fail = false; let absent = false; const removed: string[] = [];
  const metadata = (publicId: string) => ({ public_id: publicId, version: 123, format: 'webp', bytes: 120, width: 100, height: 80, resource_type: 'image' });
  const transport: TransporteCloudinary = {
    async upload(chave) { if (fail) throw new Error('segredo-provedor'); return metadata(chave); },
    async rename(_a, b) { return metadata(b); },
    async resource(chave) { if (absent) throw { http_code: 404 }; return metadata(chave); },
    async destroy(chave) { removed.push(chave); return { result: absent ? 'not found' : 'ok' }; }
  };
  return { storage: new CloudinaryImagens(config, transport), removed, fail() { fail = true; }, absent() { absent = true; } };
}
test('Cloudinary: namespace, metadados, publicação e URL fechada sem credenciais', async () => {
  const s = setup(); const result = await s.storage.enviarTemporaria(temp, Buffer.from('fixture'));
  assert.deepEqual(result, { chave: temp, version: '123', formato: 'webp', bytes: 120, largura: 100, altura: 80 });
  assert.equal((await s.storage.publicar(temp, key)).chave, key);
  const url = s.storage.url(key, '123', 'card'); assert.ok(url.startsWith('https://res.cloudinary.com/teste/image/upload/')); assert.ok(url.includes('/v123/')); assert.ok(!url.includes('nao-real'));
  await assert.rejects(s.storage.enviarTemporaria('pasta-pessoal/foto', Buffer.from('x'))); assert.throws(() => s.storage.url('https://evil.invalid/a', '123', 'card'));
});
test('Cloudinary: erros privados não vazam; not-found e remoção repetida são idempotentes', async () => {
  const s = setup(); s.fail(); await assert.rejects(s.storage.enviarTemporaria(temp, Buffer.from('x')), error => error instanceof Error && !error.message.includes('segredo-provedor'));
  s.absent(); assert.equal(await s.storage.consultar(key, 'upload'), null);
  await s.storage.remover(key, 'upload'); await s.storage.remover(key, 'upload'); assert.equal(s.removed.length, 2);
});
test('Cloudinary: configuração parcial é rejeitada sem imprimir valores', () => {
  assert.throws(() => validarConfigCloudinary({ CLOUDINARY_CLOUD_NAME: 'teste' }));
  assert.equal(validarConfigCloudinary({ CLOUDINARY_CLOUD_NAME: 'teste', CLOUDINARY_API_KEY: '123', CLOUDINARY_API_SECRET: 'secret' }).cloudName, 'teste');
});
