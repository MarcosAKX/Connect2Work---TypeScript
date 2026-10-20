export type TipoEntrega = 'authenticated' | 'upload';
export interface MetadadosImagem { chave: string; version: string; formato: 'webp'; bytes: number; largura: number; altura: number; }
export interface ArmazenamentoImagens {
  enviarTemporaria(chave: string, conteudo: Buffer): Promise<MetadadosImagem>;
  publicar(chaveTemporaria: string, chavePublica: string): Promise<MetadadosImagem>;
  consultar(chave: string, tipo: TipoEntrega): Promise<MetadadosImagem | null>;
  remover(chave: string, tipo: TipoEntrega): Promise<void>;
  url(chave: string, version: string, tamanho: 'card' | 'galeria'): string;
}
