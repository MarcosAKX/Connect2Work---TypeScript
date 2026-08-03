const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const IMAGE_UPLOAD_LIMIT_BYTES = 2 * 1024 * 1024;

export async function prepareImageUpload(file: File, maxDimension = 1600): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) throw new Error('Use uma imagem JPEG, PNG ou WebP.');
  if (file.size > IMAGE_UPLOAD_LIMIT_BYTES) throw new Error('A imagem deve ter no máximo 2 MB.');

  const source = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível processar a imagem.');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  return canvas.toDataURL('image/webp', 0.84);
}
