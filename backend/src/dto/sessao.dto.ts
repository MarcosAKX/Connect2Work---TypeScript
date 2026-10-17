import type { UsuarioPublicoDto } from './usuario-publico.dto';
export interface SessaoDto { user: UsuarioPublicoDto; idleExpiresAt: string; absoluteExpiresAt: string; }
