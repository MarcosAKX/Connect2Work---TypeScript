export type SituacaoTarefa = 'todo' | 'in_progress' | 'done';
export type PrioridadeTarefa = 'low' | 'medium' | 'high';
export interface TarefaDto {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  priority: PrioridadeTarefa;
  dueDate?: string;
  status: SituacaoTarefa;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}
export interface DadosTarefa { title: string; description: string; assignedTo: string | null; priority: PrioridadeTarefa; }
export interface CriacaoTarefa extends DadosTarefa { requestId: string; dueDate: string | null; }
export interface EdicaoTarefa extends DadosTarefa { expectedVersion: string; }
export interface ConsultaTarefas { page: number; pageSize: number; ownership: 'all' | 'mine'; }
export interface PaginaTarefas {
  items: TarefaDto[]; total: number; page: number; pageSize: number;
  counts: Record<SituacaoTarefa, number>;
}
export interface PessoaEquipe { id: string; name: string; }
