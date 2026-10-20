import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { ProcessadorImagem } from '../src/security/processador-imagem';
import { BadRequestException } from '@nestjs/common';
test('processador de imagens valida conteúdo real, remove metadados e limita dimensões', async () => {
  const processor = new ProcessadorImagem();
  const originalGrande = await sharp({ create: { width: 1500, height: 1500, channels: 3, background: 'white' } }).png({ compressionLevel: 0 }).toBuffer();
  assert.ok(originalGrande.length > 5 * 1024 * 1024 && originalGrande.length < 10 * 1024 * 1024);
  const otimizada = await processor.processar(originalGrande); assert.ok(otimizada.conteudo.length < 5 * 1024 * 1024);
  for (const formato of ['png', 'jpeg', 'webp'] as const) {
    const bytes = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: 'white' } }).toFormat(formato).toBuffer();
    const result = await processor.processar(bytes); const metadata = await sharp(result.conteudo).metadata();
    assert.equal(metadata.format, 'webp'); assert.equal(result.largura, 1600); assert.equal(result.altura, 800); assert.equal(metadata.exif, undefined);
  }
  await assert.rejects(processor.processar(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), { status: 400 });
  await assert.rejects(processor.processar(Buffer.alloc(10485761)), { status: 400 });
  await assert.rejects(processor.processar(Buffer.from('corrompido')), { status: 400 });
  const big = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: 'white' } }).png().toBuffer();
  assert.equal((await processor.processar(big)).largura, 1600);
  const excessive = await sharp({ create: { width: 7000, height: 6000, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(processor.processar(excessive), (error: unknown) => { if (!(error instanceof BadRequestException)) return false; const response = error.getResponse(); return typeof response === 'object' && 'code' in response && response.code === 'IMAGE_PIXEL_LIMIT'; });
});
