import type { AtorAdministrativo } from '../../security/acesso-administrativo';
import type { PeriodoAgendamento } from '../../domain/periodo-agendamento';
import type { ResultadoReserva, ConsultaMeusAgendamentos, PaginaReservasCliente, ItemReservaCliente } from '../../dto/agendamento.dto';
export interface PedidoAgendamento { requestId: string; roomId: string; periodo: PeriodoAgendamento; }
export interface DiaDaSala { precoDecimal: string; ocupados: Array<{ inicio: Date; fim: Date }>; }
export interface RepositorioAgendamentos {
  listarMeus(ator:AtorAdministrativo,query:ConsultaMeusAgendamentos):Promise<PaginaReservasCliente>;
  cancelarMeu(ator:AtorAdministrativo,id:string,version:string):Promise<ItemReservaCliente>;
  consultarDia(roomId: string, inicio: Date, fim: Date): Promise<DiaDaSala | null>;
  criarPendente(ator: AtorAdministrativo, pedido: PedidoAgendamento): Promise<ResultadoReserva>;
}
