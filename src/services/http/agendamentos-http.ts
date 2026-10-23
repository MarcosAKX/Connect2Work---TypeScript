import type { BookingGateway } from '../contracts';
import type { Booking, BookingAvailability, BookingStatus, CreateBookingInput, OwnBookingItem, OwnBookingsPage } from '../../types/domain';
import { HOURS } from '../../utils/booking';
const failure='Não foi possível consultar os agendamentos. Tente novamente.';
class ErroAgendamento extends Error {}
export class ConflitoAgendamento extends ErroAgendamento {}
function object(v:unknown):Record<string,unknown> { if(!v||typeof v!=='object'||Array.isArray(v))throw new ErroAgendamento(failure);return Object.fromEntries(Object.entries(v)); }
function text(v:unknown):string { if(typeof v!=='string')throw new ErroAgendamento(failure);return v; }
function id(v:unknown):string { const s=text(v);if(!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(s))throw new ErroAgendamento(failure);return s; }
function number(v:unknown):number { if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw new ErroAgendamento(failure);return v; }
function instant(v:unknown):string {const s=text(v);if(!s.endsWith('Z')||!Number.isFinite(Date.parse(s)))throw new ErroAgendamento(failure);return s;}
function date(v:unknown):string {const s=text(v);if(!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T12:00:00Z'))||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)throw new ErroAgendamento(failure);return s;}
function ownItem(value:unknown):OwnBookingItem {
  const item=object(value),o=object(item.booking);
  const status=o.status,adminStatus=o.adminStatus,paymentStatus=o.paymentStatus;
  if(status!=='upcoming'&&status!=='past'&&status!=='cancelled'||adminStatus!=='pending'&&adminStatus!=='confirmed'&&adminStatus!=='cancelled'||paymentStatus!=='pending'&&paymentStatus!=='completed'||(status==='cancelled')!==(adminStatus==='cancelled')||typeof o.clientCanCancel!=='boolean'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(text(o.version))||!/^\d{2}:\d{2} - \d{2}:\d{2}$/.test(text(o.timeSlot)))throw new ErroAgendamento(failure);
  const roomName=text(item.roomName),unitName=text(item.unitName),reason=o.clientCancelReason===undefined?undefined:text(o.clientCancelReason);
  if(!roomName||roomName.length>150||!unitName||unitName.length>150||(reason?.length??0)>500)throw new ErroAgendamento(failure);
  return {roomName,unitName,booking:{id:id(o.id),userId:id(o.userId),unitId:id(o.unitId),roomId:id(o.roomId),date:date(o.date),timeSlot:text(o.timeSlot),status,adminStatus,paymentStatus,total:number(o.total),hoursFromPlan:number(o.hoursFromPlan),createdAt:instant(o.createdAt),version:text(o.version),clientCanCancel:o.clientCanCancel,...(reason?{clientCancelReason:reason}:{})}};
}
export class AgendamentosHttpGateway implements Pick<BookingGateway,'getAvailability'|'create'|'listOwn'|'cancel'> {
  constructor(private readonly fetcher:typeof fetch=(input,init)=>fetch(input,init),private readonly expired:()=>void|Promise<unknown>=()=>{}) {}
  private async request(path:string,body?:unknown):Promise<unknown> {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000),write=body!==undefined;
    try {
      const response=await this.fetcher('/api'+path,{method:write?'POST':'GET',credentials:'include',cache:'no-store',signal:controller.signal,...(write?{headers:{'Content-Type':'application/json','X-C2W-Request':'1'},body:JSON.stringify(body)}:{})});
      if(response.status===401){await this.expired();throw new ErroAgendamento('Sessão encerrada. Faça login novamente.');}
      if(response.status===403)throw new ErroAgendamento('Acesso não permitido para esta conta.');
      if(response.status===400)throw new ErroAgendamento('Confira os dados da solicitação.');
      if(response.status===404)throw new ErroAgendamento('Registro não encontrado. Atualize a lista.');
      if(response.status===429)throw new ErroAgendamento('Muitas solicitações. Aguarde um minuto.');
      if(response.status===409){const error=object(await response.json());if(error.code==='HORARIO_OCUPADO')throw new ConflitoAgendamento('O horário foi ocupado. Escolha outro período.');throw new ErroAgendamento('Pedido em conflito. Confira a solicitação com a equipe antes de iniciar outra.');}
      if(!response.ok)throw new ErroAgendamento(write?'Não foi possível confirmar a solicitação. Atualize seus agendamentos antes de repetir.':failure);
      return await response.json();
    }catch(error:unknown){if(error instanceof ErroAgendamento)throw error;throw new ErroAgendamento(write?'Não foi possível confirmar a solicitação. Atualize seus agendamentos antes de repetir.':failure);}
    finally{clearTimeout(timer);}
  }
  async listOwn(status:BookingStatus,cursor?:string):Promise<OwnBookingsPage> {
    const q=new URLSearchParams({status});if(cursor)q.set('cursor',cursor);
    const page=object(await this.request('/agendamentos/meus?'+q)),counts=object(page.counts);
    if(!Array.isArray(page.items)||page.items.length>20)throw new ErroAgendamento(failure);
    const items=page.items.map(ownItem);
    if(items.some(item=>item.booking.status!==status)||new Set(items.map(item=>item.booking.id)).size!==items.length)throw new ErroAgendamento(failure);
    const upcoming=number(counts.upcoming),past=number(counts.past),cancelled=number(counts.cancelled);
    if(![upcoming,past,cancelled].every(Number.isSafeInteger))throw new ErroAgendamento(failure);
    const nextCursor=page.nextCursor===null?null:text(page.nextCursor);
    if(nextCursor!==null&&(!/^[\w-]+$/.test(nextCursor)||nextCursor.length>180))throw new ErroAgendamento(failure);
    return {items,counts:{upcoming,past,cancelled},nextCursor,serverNow:instant(page.serverNow)};
  }
  async cancel(bookingId:string,userId:string,expectedVersion?:string):Promise<Booking> {
    if(!expectedVersion)throw new ErroAgendamento('Atualize seus agendamentos antes de cancelar.');
    const item=ownItem(await this.request('/agendamentos/'+encodeURIComponent(bookingId)+'/cancelamento',{expectedVersion}));
    if(item.booking.id!==bookingId||item.booking.userId!==userId||item.booking.status!=='cancelled')throw new ErroAgendamento(failure);
    return item.booking;
  }
  async getAvailability(roomId:string,day:string):Promise<BookingAvailability> {
    const o=object(await this.request('/salas/'+encodeURIComponent(roomId)+'/disponibilidade?data='+encodeURIComponent(day)));
    if(id(o.roomId)!==roomId||date(o.date)!==day||o.timeZone!=='America/Sao_Paulo'||!Array.isArray(o.slots)||o.slots.length!==13)throw new ErroAgendamento(failure);
    const slots=o.slots.map((v:unknown,i:number)=>{const s=object(v);if(s.start!==HOURS[i]||s.end!==HOURS[i+1]||typeof s.available!=='boolean')throw new ErroAgendamento(failure);return {start:text(s.start),end:text(s.end),available:s.available};});
    return {roomId,date:day,timeZone:'America/Sao_Paulo',serverNow:instant(o.serverNow),pricePerHour:number(o.pricePerHour),slots};
  }
  async create(input:CreateBookingInput):Promise<Booking> {
    if(!input.requestId)throw new ErroAgendamento('Inicie uma nova seleção para solicitar a reserva.');
    const o=object(await this.request('/agendamentos',{requestId:input.requestId,roomId:input.roomId,date:input.date,timeSlot:input.timeSlot}));
    if(id(o.id)!==input.requestId||id(o.userId)!==input.userId||id(o.roomId)!==input.roomId||date(o.date)!==input.date||o.timeSlot!==input.timeSlot)throw new ErroAgendamento('Não foi possível confirmar a solicitação. Repita o mesmo pedido.');
    const status=o.status,adminStatus=o.adminStatus,paymentStatus=o.paymentStatus;
    if(status!=='upcoming'&&status!=='past'&&status!=='cancelled'||adminStatus!=='pending'&&adminStatus!=='confirmed'&&adminStatus!=='cancelled'||paymentStatus!=='pending'&&paymentStatus!=='completed'||number(o.hoursFromPlan)!==0||(status==='cancelled')!==(adminStatus==='cancelled'))throw new ErroAgendamento(failure);
    return {id:input.requestId,userId:id(o.userId),unitId:id(o.unitId),roomId:input.roomId,date:input.date,timeSlot:input.timeSlot,status,adminStatus,paymentStatus,total:number(o.total),hoursFromPlan:0,createdAt:instant(o.createdAt)};
  }
}
