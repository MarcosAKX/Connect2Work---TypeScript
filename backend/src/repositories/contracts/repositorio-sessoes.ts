export interface SessaoValida { usuarioId: string; ultimaAtividadeEm: Date; expiraEm: Date; }
export interface RepositorioSessoes {
  criar(usuarioId: string, hash: Buffer, agora: Date, expiraEm: Date, hashAnterior: Buffer | null): Promise<void>;
  consultar(hash: Buffer, agora: Date): Promise<SessaoValida | null>;
  registrarAtividade(hash: Buffer, agora: Date): Promise<SessaoValida | null>;
  revogar(hash: Buffer, agora: Date): Promise<void>;
}
