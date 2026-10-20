import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { validarConfigCloudinary } from './config/cloudinary-environment';
import { CloudinaryImagens } from './storage/cloudinary-imagens';
async function check(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Somente local.');
  const config = validarConfigCloudinary(process.env); const storage = new CloudinaryImagens(config); const id = randomUUID();
  const temporary = config.namespace + '/temporarios/' + id; const published = config.namespace + '/catalogo/' + id;
  try {
    const buffer = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#eab308' } }).webp().toBuffer();
    const sent = await storage.enviarTemporaria(temporary, buffer); assert.equal(sent.largura, 32);
    assert.ok(await storage.consultar(temporary, 'authenticated'));
    const privateUrl = `https://res.cloudinary.com/${config.cloudName}/image/authenticated/v${sent.version}/${temporary}.webp`;
    const denied = await fetch(privateUrl); assert.ok(!denied.ok, 'Temporário deve exigir assinatura');
    const photo = await storage.publicar(temporary, published); assert.ok(await storage.consultar(published, 'upload'));
    const response = await fetch(storage.url(published, photo.version, 'galeria')); assert.equal(response.status, 200); assert.match(response.headers.get('content-type') ?? '', /^image\//);
    const decoded = await sharp(Buffer.from(await response.arrayBuffer())).metadata(); assert.equal(decoded.width, 32);
    console.log('Cloudinary: temporário privado, publicação, entrega WebP e remoção da fixture OK.');
  } finally {
    await storage.remover(temporary, 'authenticated'); await storage.remover(published, 'upload');
    assert.equal(await storage.consultar(temporary, 'authenticated'), null); assert.equal(await storage.consultar(published, 'upload'), null);
  }
}
check().catch(() => { console.error('Verificação Cloudinary falhou; confira integração e recurso de teste no namespace configurado.'); process.exitCode = 1; });
