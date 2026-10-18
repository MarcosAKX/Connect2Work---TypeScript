import type { UsuarioPublicoDto } from './usuario-publico.dto';
export type Papel = 'admin' | 'client' | 'secretaria';
export interface UsuarioGerenciadoDto extends UsuarioPublicoDto { version: string; updatedAt?: string; }
export interface ResumoUsuarios { total: number; active: number; inactive: number; admin: number; client: number; secretaria: number; }
export interface ConsultaUsuarios { search: string; role?: Papel; active?: boolean; page: number; pageSize: number; }
export interface PaginaUsuarios { items: UsuarioGerenciadoDto[]; page: number; pageSize: number; total: number; summary: ResumoUsuarios; }
export interface DadosUsuario { name: string; email: string; profession: string; phone: string; role: Papel; active: boolean; senhaHash?: string; }
