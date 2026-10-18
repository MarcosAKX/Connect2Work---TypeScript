import type { SalaDto } from '../../dto/sala.dto';
export interface RepositorioSalas {
  listarPorUnidade(id: string): Promise<SalaDto[]>;
  buscarPorId(id: string): Promise<SalaDto | null>;
}
