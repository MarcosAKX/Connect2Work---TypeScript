export interface NovoUsuario {
  id: string; name: string; email: string; profession: string; phone: string;
  senhaHash: string; createdAt: string;
}
export interface RepositorioUsuarios { criar(usuario: NovoUsuario): Promise<void>; }