import type { ReservaAdministrativa } from './agendamento-administrativo.dto';
export interface SolicitacaoAgendamento { requestId: string; roomId: string; date: string; timeSlot: string; }
export type ReservaPublicaDto = Omit<ReservaAdministrativa, 'version'>;
export interface ResultadoReserva { reserva: ReservaPublicaDto; criada: boolean; }
export interface DisponibilidadeDto {
  roomId: string; date: string; timeZone: 'America/Sao_Paulo'; serverNow: string; pricePerHour: number;
  slots: Array<{ start: string; end: string; available: boolean }>;
}
export type SituacaoListaCliente = 'upcoming'|'past'|'cancelled';
export interface CursorCliente { at:string; id:string; }
export interface ConsultaMeusAgendamentos { status:SituacaoListaCliente; cursor:CursorCliente|null; }
export interface ReservaClienteDto extends ReservaAdministrativa { clientCanCancel:boolean; clientCancelReason?:string; }
export interface ItemReservaCliente { booking:ReservaClienteDto; roomName:string; unitName:string; }
export interface PaginaReservasCliente { items:ItemReservaCliente[]; counts:Record<SituacaoListaCliente,number>; nextCursor:string|null; serverNow:string; }
