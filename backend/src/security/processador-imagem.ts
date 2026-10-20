import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { LIMITE_IMAGEM_ORIGINAL, LIMITE_IMAGEM_OTIMIZADA, LIMITE_PIXELS_IMAGEM } from '../config/limites-imagens';
export class ProcessadorImagem {
  async processar(bytes: Buffer): Promise<{ conteudo: Buffer; largura: number; altura: number }> {
    const invalid = () => new BadRequestException({ code: 'IMAGE_INVALID', message: 'Use uma imagem JPEG, PNG ou WebP válida de até 10 MiB e 40 megapixels.' });
    if (bytes.length > LIMITE_IMAGEM_ORIGINAL) throw new BadRequestException({ code: 'IMAGE_SIZE_LIMIT', message: 'A imagem deve ter no máximo 10 MiB.' });
    if (!bytes.length) throw invalid();
    // A biblioteca aceita outros formatos; a aplicação verifica também a assinatura antes de decodificar.
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    if (!jpeg && !png && !webp) throw invalid();
    try {
      // Ler dimensões não decodifica a matriz de pixels; a decodificação abaixo continua limitada.
      const metadata = await sharp(bytes, { limitInputPixels: false, failOn: 'warning', animated: false }).metadata();
      if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) throw invalid();
      if (metadata.width * metadata.height > LIMITE_PIXELS_IMAGEM) throw new BadRequestException({ code: 'IMAGE_PIXEL_LIMIT', message: 'A imagem deve ter no máximo 40 megapixels.' });
      const image = sharp(bytes, { limitInputPixels: LIMITE_PIXELS_IMAGEM, failOn: 'warning', animated: false });
      const result = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
      if (!result.data.length || result.data.length > LIMITE_IMAGEM_OTIMIZADA) throw invalid();
      return { conteudo: result.data, largura: result.info.width, altura: result.info.height };
    } catch (error: unknown) { if (error instanceof BadRequestException) throw error; throw invalid(); }
  }
}
