import type { AtorAdministrativo } from '../../security/acesso-administrativo';
import type { CatalogoDto, ConsultaCatalogo, DadosSala, DadosUnidade, PaginaCatalogo, SalaAdministrativaDto, UnidadeAdministrativaDto } from '../../dto/catalogo-administrativo.dto';
export interface OperacaoCatalogo { entidade: 'unit' | 'room'; acao: 'create' | 'update' | 'delete'; id: string; expectedVersion?: string; data?: DadosUnidade | DadosSala; }
export interface RepositorioCatalogoAdministrativo {
  listarUnidades(query: ConsultaCatalogo): Promise<PaginaCatalogo<UnidadeAdministrativaDto>>;
  listarSalas(query: ConsultaCatalogo): Promise<PaginaCatalogo<SalaAdministrativaDto>>;
  opcoes(search: string): Promise<{ id: string; name: string }[]>;
  gravar(ator: AtorAdministrativo, op: OperacaoCatalogo): Promise<CatalogoDto | null>;
}
