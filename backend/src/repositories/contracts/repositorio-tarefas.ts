import type { AtorAdministrativo } from '../../security/acesso-administrativo';
import type { CriacaoTarefa, EdicaoTarefa, ConsultaTarefas, PaginaTarefas, PessoaEquipe, TarefaDto, SituacaoTarefa } from '../../dto/tarefa.dto';
export type AlteracaoTarefa = { action: 'update'; data: EdicaoTarefa } | { action: 'status'; status: SituacaoTarefa; expectedVersion: string } | { action: 'delete'; expectedVersion: string };
export interface RepositorioTarefas {
  listar(actor: AtorAdministrativo, query: ConsultaTarefas): Promise<PaginaTarefas>;
  equipe(): Promise<PessoaEquipe[]>;
  atencao(): Promise<number>;
  criar(actor: AtorAdministrativo, input: CriacaoTarefa): Promise<TarefaDto>;
  alterar(actor: AtorAdministrativo, id: string, change: AlteracaoTarefa): Promise<TarefaDto | null>;
}
