export interface CloudinaryConfig { cloudName: string; apiKey: string; apiSecret: string; namespace: string; }
export function validarConfigCloudinary(env: Record<string, string | undefined>): CloudinaryConfig {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim(); const apiKey = env.CLOUDINARY_API_KEY?.trim(); const apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  const namespace = env.CLOUDINARY_NAMESPACE ?? 'connect2work/local';
  if (!cloudName || !/^[a-zA-Z\d_-]+$/.test(cloudName) || !apiKey || !/^\d+$/.test(apiKey) || !apiSecret || !/^connect2work\/[a-z\d_-]{1,40}$/.test(namespace)) throw new Error('Configuração Cloudinary incompleta ou inválida.');
  if (env.NODE_ENV === 'production' && namespace === 'connect2work/local') throw new Error('Configure namespace de produção.');
  return { cloudName, apiKey, apiSecret, namespace };
}
