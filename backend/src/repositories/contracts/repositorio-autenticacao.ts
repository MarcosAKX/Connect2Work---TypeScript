import type { UsuarioPublicoDto } from '../../dto/usuario-publico.dto';
export interface RepositorioAutenticacao {
  buscarCredenciais(email: string): Promise<{ usuario: UsuarioPublicoDto; senhaHash: string | null } | null>;
  buscarPublico(id: string): Promise<UsuarioPublicoDto | null>;
}
