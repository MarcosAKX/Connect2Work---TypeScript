import type { AtorAdministrativo } from '../../security/acesso-administrativo';
import type { MetadadosImagem } from '../../storage/armazenamento-imagens';
export type EstadoArquivo = 'preparando' | 'temporario' | 'publicando' | 'disponivel' | 'vinculado' | 'removendo' | 'removido';
export interface ArquivoImagem { id: string; proprietarioId: string; chaveTemporaria: string; chavePublica: string; estado: EstadoArquivo; version: string | null; expiraEm: Date; leaseId: string | null; }
export interface RepositorioArquivosImagens {
  registrar(ator: AtorAdministrativo, dados: { bytes: number; largura: number; altura: number }): Promise<ArquivoImagem>;
  obter(ids: readonly string[]): Promise<ArquivoImagem[]>;
  reivindicarPublicacao(ator: AtorAdministrativo, id: string): Promise<ArquivoImagem>;
  atualizar(id: string, lease: string, estado: 'temporario' | 'disponivel' | 'removido', meta?: MetadadosImagem): Promise<void>;
  reivindicarLimpeza(): Promise<ArquivoImagem | null>;
  falhou(id: string, lease: string): Promise<void>;
}
