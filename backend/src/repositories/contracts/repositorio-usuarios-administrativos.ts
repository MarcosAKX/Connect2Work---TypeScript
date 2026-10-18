import type { AtorAdministrativo } from '../../security/acesso-administrativo';
import type { ConsultaUsuarios, DadosUsuario, PaginaUsuarios, Papel, UsuarioGerenciadoDto } from '../../dto/usuario-gerenciado.dto';
export type OperacaoUsuario =
  | { kind: 'create'; id: string; data: DadosUsuario }
  | { kind: 'update'; id: string; expectedVersion: string; data: DadosUsuario }
  | { kind: 'role'; id: string; expectedVersion: string; role: Papel }
  | { kind: 'status'; id: string; expectedVersion: string; active: boolean };
export interface RepositorioUsuariosAdministrativos {
  listar(consulta: ConsultaUsuarios): Promise<PaginaUsuarios>;
  gravar(ator: AtorAdministrativo, operacao: OperacaoUsuario): Promise<UsuarioGerenciadoDto>;
  equipe(): Promise<{ id: string; name: string }[]>;
  clientes(search: string): Promise<{ id: string; name: string; email: string }[]>;
}
