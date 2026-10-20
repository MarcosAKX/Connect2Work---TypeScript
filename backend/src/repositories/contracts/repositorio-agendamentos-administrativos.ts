import type { AtorAdministrativo } from '../../security/acesso-administrativo';
import type { AcaoAgendamento, ConsultaAgendamentos, PedidoAdministrativo, LinhaAgendamento, PaginaAgendamentos, PainelAgendamentos } from '../../dto/agendamento-administrativo.dto';
export interface RepositorioAgendamentosAdministrativos {
  listar(ator: AtorAdministrativo,q: ConsultaAgendamentos): Promise<PaginaAgendamentos>;
  painel(ator: AtorAdministrativo,q: ConsultaAgendamentos): Promise<PainelAgendamentos>;
  criar(ator: AtorAdministrativo,pedido: PedidoAdministrativo): Promise<{item: LinhaAgendamento; criada: boolean}>;
  alterar(ator: AtorAdministrativo,id: string,acao: AcaoAgendamento,version: string,reason: string): Promise<LinhaAgendamento>;
}
