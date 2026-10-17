import type { UnidadeDto } from '../../dto/unidade.dto';
export interface RepositorioUnidades { listar(): Promise<UnidadeDto[]>; }
