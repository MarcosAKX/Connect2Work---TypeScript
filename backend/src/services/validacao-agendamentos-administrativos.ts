import { BadRequestException } from '@nestjs/common';
import { objeto, texto, uuid, versao } from './validacao-usuario-administrativo';
import { validarData } from '../domain/horario-comercial';
import { PeriodoAgendamento } from '../domain/periodo-agendamento';
import type { ConsultaAgendamentos, PedidoAdministrativo, AcaoAgendamento } from '../dto/agendamento-administrativo.dto';
function invalid(): never { throw new BadRequestException('Dados inválidos. Confira os campos.'); }
export function consultaAgendamentos(input: unknown): ConsultaAgendamentos {
  const b=objeto(input,['page','pageSize','search','unitId','status','dateFrom','dateTo','operational','period']);
  function integer(v: unknown,d: number,max: number) { if(v===undefined)return d; if(typeof v!=='string'||!/^\d{1,5}$/.test(v)||Number(v)<1||Number(v)>max)invalid();return Number(v); }
  const q={ page:integer(b.page,1,10000),pageSize:integer(b.pageSize,20,100),search:b.search===undefined?'':texto(b.search,150),unitId:b.unitId===undefined?'':uuid(texto(b.unitId,36)),status:b.status===undefined?'':texto(b.status,15),dateFrom:b.dateFrom===undefined?'':texto(b.dateFrom,10),dateTo:b.dateTo===undefined?'':texto(b.dateTo,10),operational:b.operational===undefined?'all':texto(b.operational,15),period:b.period===undefined?'all':texto(b.period,15) };
  if(!['','pending','confirmed','cancelled'].includes(q.status)||!['all','waiting','present','payment','checked-in','cancelled'].includes(q.operational)||!['all','morning','afternoon','next'].includes(q.period))invalid();
  if(q.dateFrom)validarData(q.dateFrom);if(q.dateTo)validarData(q.dateTo);if(q.dateFrom&&q.dateTo&&q.dateFrom>q.dateTo)invalid();return q;
}
export function criacaoAgendamento(input: unknown): PedidoAdministrativo {
  const b=objeto(input,['requestId','clientId','roomId','date','timeSlot','total','paymentStatus']);
  const requestId=texto(b.requestId,36); if(!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/.test(requestId))invalid();
  const date=texto(b.date,10),timeSlot=texto(b.timeSlot,13);PeriodoAgendamento.criar(date,timeSlot);
  if(typeof b.total!=='string'||!/^\d{1,10}(?:\.\d{1,2})?$/.test(b.total))invalid();
  const [whole,part='']=b.total.split('.');const centavos=Number(whole)*100+Number(part.padEnd(2,'0'));if(centavos>999999999999)invalid();
  if(b.paymentStatus!=='pending'&&b.paymentStatus!=='completed')invalid();
  return {requestId,clientId:uuid(texto(b.clientId,36)),roomId:uuid(texto(b.roomId,36)),date,timeSlot,centavos,paymentStatus:b.paymentStatus};
}
export function acaoAgendamento(action: AcaoAgendamento,input: unknown): {expectedVersion: string; reason: string} {
  const b=objeto(input,action==='cancelamento'?['expectedVersion','reason']:['expectedVersion']);
  const reason=action==='cancelamento'?texto(b.reason,1000):'';if(action==='cancelamento'&&!reason)invalid();return {expectedVersion:versao(b.expectedVersion),reason};
}
