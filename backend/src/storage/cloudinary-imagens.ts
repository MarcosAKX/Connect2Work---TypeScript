import { v2 as cloudinary } from 'cloudinary';
import { ServiceUnavailableException } from '@nestjs/common';
import type { CloudinaryConfig } from '../config/cloudinary-environment';
import { LIMITE_IMAGEM_OTIMIZADA } from '../config/limites-imagens';
import type { ArmazenamentoImagens, MetadadosImagem, TipoEntrega } from './armazenamento-imagens';
export interface TransporteCloudinary {
  upload(chave: string, conteudo: Buffer): Promise<unknown>;
  rename(origem: string, destino: string): Promise<unknown>;
  resource(chave: string, tipo: TipoEntrega): Promise<unknown>;
  destroy(chave: string, tipo: TipoEntrega): Promise<unknown>;
}
function unavailable(): never { throw new ServiceUnavailableException('Não foi possível processar a imagem no armazenamento. Tente novamente.'); }
function obj(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object') unavailable(); return Object.fromEntries(Object.entries(value)); }
function meta(value: unknown, chave: string): MetadadosImagem {
  const o = obj(value); const version = String(o.version);
  if (o.public_id !== chave || o.resource_type !== 'image' || o.format !== 'webp' || !/^\d{1,16}$/.test(version) || !Number.isSafeInteger(Number(version))) unavailable();
  const positive = (v: unknown, max: number) => { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 1 || v > max) unavailable(); return v; };
  return { chave, version, formato: 'webp', bytes: positive(o.bytes, LIMITE_IMAGEM_OTIMIZADA), largura: positive(o.width, 1600), altura: positive(o.height, 1600) };
}
function naoExiste(error: unknown): boolean { if (!error || typeof error !== 'object') return false; if ('http_code' in error && error.http_code === 404) return true; return 'error' in error ? naoExiste(error.error) : false; }
function transporte(config: CloudinaryConfig): TransporteCloudinary {
  const auth = { cloud_name: config.cloudName, api_key: config.apiKey, api_secret: config.apiSecret, timeout: 15000 };
  return {
    async upload(chave, buffer): Promise<unknown> { return new Promise((resolve, reject) => { const stream = cloudinary.uploader.upload_stream({ ...auth, public_id: chave, type: 'authenticated', resource_type: 'image', overwrite: false, format: 'webp' }, (error, result) => { if (error) reject(error); else resolve(result); }); stream.on('error', reject); stream.end(buffer); }); },
    async rename(origem, destino): Promise<unknown> { return cloudinary.uploader.rename(origem, destino, { ...auth, resource_type: 'image', type: 'authenticated', to_type: 'upload', overwrite: false, invalidate: true }); },
    async resource(chave, tipo): Promise<unknown> { return cloudinary.api.resource(chave, { ...auth, resource_type: 'image', type: tipo }); },
    async destroy(chave, tipo): Promise<unknown> { return cloudinary.uploader.destroy(chave, { ...auth, resource_type: 'image', type: tipo, invalidate: true }); }
  };
}
export class CloudinaryImagens implements ArmazenamentoImagens {
  private readonly transport: TransporteCloudinary;
  constructor(private readonly config: CloudinaryConfig, transport?: TransporteCloudinary) { this.transport = transport ?? transporte(config); }
  private chave(chave: string, pasta?: 'temporarios' | 'catalogo'): void {
    const suffix = chave.slice(this.config.namespace.length + 1); const [folder, id, extra] = suffix.split('/');
    if (!chave.startsWith(this.config.namespace + '/') || (folder !== 'temporarios' && folder !== 'catalogo') || (pasta && folder !== pasta) || !id || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/.test(id) || extra !== undefined) unavailable();
  }
  async enviarTemporaria(chave: string, buffer: Buffer): Promise<MetadadosImagem> { this.chave(chave, 'temporarios'); try { return meta(await this.transport.upload(chave, buffer), chave); } catch { return unavailable(); } }
  async publicar(origem: string, destino: string): Promise<MetadadosImagem> { this.chave(origem, 'temporarios'); this.chave(destino, 'catalogo'); try { return meta(await this.transport.rename(origem, destino), destino); } catch { return unavailable(); } }
  async consultar(chave: string, tipo: TipoEntrega): Promise<MetadadosImagem | null> { this.chave(chave); try { return meta(await this.transport.resource(chave, tipo), chave); } catch (error: unknown) { if (naoExiste(error)) return null; return unavailable(); } }
  async remover(chave: string, tipo: TipoEntrega): Promise<void> { this.chave(chave); try { const result = obj(await this.transport.destroy(chave, tipo)); if (result.result !== 'ok' && result.result !== 'not found') unavailable(); } catch (error: unknown) { if (!naoExiste(error)) unavailable(); } }
  url(chave: string, version: string, tamanho: 'card' | 'galeria'): string {
    this.chave(chave, 'catalogo'); if (!/^\d{1,16}$/.test(version) || !Number.isSafeInteger(Number(version))) unavailable();
    return cloudinary.url(chave, { cloud_name: this.config.cloudName, secure: true, resource_type: 'image', type: 'upload', version: Number(version), format: 'webp', width: tamanho === 'card' ? 640 : 1600, crop: 'limit', quality: 'auto' });
  }
}
