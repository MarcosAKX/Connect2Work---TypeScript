import type { AdminBookingsGateway } from '../contracts';
import type { AdminBookingRecord,AdminBookingsQuery,AdminBookingsPage,AdminDailyBookings,AdminBookingInput,AdminClientOption,Booking,BookingAdminStatus,BookingPaymentStatus } from '../../types/domain';
const failure='Não foi possível consultar os agendamentos. Tente novamente.';
function object(v: unknown): Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(failure);return Object.fromEntries(Object.entries(v));}
function text(v: unknown,max=1000): string{if(typeof v!=='string'||v.length>max)throw new Error(failure);return v;}
function integer(v: unknown): number{if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0)throw new Error(failure);return v;}
function number(v: unknown): number{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>9999999999.99)throw new Error(failure);return v;}
function array(v: unknown): unknown[]{if(!Array.isArray(v))throw new Error(failure);return v;}
function id(v: unknown): string{const s=text(v,36);if(!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(s))throw new Error(failure);return s;}
function date(v: unknown): string{const s=text(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T12:00:00Z'))||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)throw new Error(failure);return s;}
function instant(v: unknown): string{const s=text(v,40);if(!s.endsWith('Z')||!Number.isFinite(Date.parse(s)))throw new Error(failure);return s;}
function adminStatus(v: unknown): BookingAdminStatus{if(v!=='pending'&&v!=='confirmed'&&v!=='cancelled')throw new Error(failure);return v;}
function payment(v: unknown): BookingPaymentStatus{if(v!=='pending'&&v!=='completed')throw new Error(failure);return v;}
export function adminBookingRecord(v: unknown): AdminBookingRecord {
 const o=object(v),b=object(o.booking),version=text(b.version,26),slot=text(b.timeSlot,13);
 if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(version)||!/^\d{2}:00 - \d{2}:00$/.test(slot))throw new Error(failure);
 const status=b.status;if(status!=='upcoming'&&status!=='past'&&status!=='cancelled')throw new Error(failure);
 const state=adminStatus(b.adminStatus);if(o.adminStatus!==state)throw new Error(failure);
 const booking:Booking={id:id(b.id),userId:id(b.userId),unitId:id(b.unitId),roomId:id(b.roomId),date:date(b.date),timeSlot:slot,status,adminStatus:state,paymentStatus:payment(b.paymentStatus),hoursFromPlan:number(b.hoursFromPlan),createdAt:instant(b.createdAt),version,...(b.total===undefined?{}:{total:number(b.total)}),...(b.checkedInAt===undefined?{}:{checkedInAt:instant(b.checkedInAt),checkedInBy:id(b.checkedInBy)}),...(b.cancelledAt===undefined?{}:{cancelledAt:instant(b.cancelledAt)}),...(b.cancellationReason===undefined?{}:{cancellationReason:text(b.cancellationReason)})};
 if((o.total===undefined)!==(b.total===undefined)||(o.total!==undefined&&number(o.total)!==b.total))throw new Error(failure);
 return {booking,clientName:text(o.clientName,150),roomName:text(o.roomName,150),unitName:text(o.unitName,150),adminStatus:state,...(o.total===undefined?{}:{total:number(o.total)})};
}
function page(v: unknown,q: AdminBookingsQuery): AdminBookingsPage {
 const o=object(v),s=object(o.summary),items=array(o.items).map(adminBookingRecord),total=integer(o.total);
 if(integer(o.page)!==q.page||integer(o.pageSize)!==q.pageSize||items.length>q.pageSize||new Set(items.map(x=>x.booking.id)).size!==items.length)throw new Error(failure);
 const summary={total:integer(s.total),confirmed:integer(s.confirmed),pending:integer(s.pending),cancelled:integer(s.cancelled),today:integer(s.today),checkInsToday:integer(s.checkInsToday),...(s.revenue===undefined?{}:{revenue:number(s.revenue)})};
 if(summary.total!==total||summary.confirmed+summary.pending+summary.cancelled!==total)throw new Error(failure);
 return {items,total,page:q.page,pageSize:q.pageSize,summary,today:date(o.today),serverNow:instant(o.serverNow)};
}
export class AgendamentosAdminHttpGateway implements AdminBookingsGateway {
 constructor(private readonly fetcher: typeof fetch=(input,init)=>fetch(input,init),private readonly expired?: ()=>Promise<unknown>|void){}
 private async request(path: string,method='GET',body?: unknown): Promise<unknown>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try {const response=await this.fetcher('/api/admin/'+path,{method,credentials:'include',cache:'no-store',signal:controller.signal,headers:method==='GET'?{}:{'Content-Type':'application/json','X-C2W-Request':'1'},...(body===undefined?{}:{body:JSON.stringify(body)})});
   if(response.status===401){await this.expired?.();throw new Error('Sessão encerrada. Faça login novamente.');}
   if(response.status===403)throw new Error('Acesso não permitido.');
   if(response.status===400)throw new Error('Confira os campos, a data e o horário informados.');
   if(response.status===409)throw new Error('Operação em conflito. Atualize a lista e confira o horário e a versão do agendamento.');
   if(response.status===429)throw new Error('Muitas solicitações. Aguarde um minuto.');
   if(!response.ok)throw new Error(method==='GET'?failure:'Não foi possível confirmar o salvamento. Atualize a lista antes de repetir.');
   return await response.json();
  }catch(error:unknown){if(error instanceof Error&&!['AbortError','TypeError','SyntaxError'].includes(error.name))throw error;throw new Error(method==='GET'?failure:'Não foi possível confirmar o salvamento. Atualize a lista antes de repetir.');}
  finally{clearTimeout(timer);}
 }
 private params(q: AdminBookingsQuery){const p=new URLSearchParams({page:String(q.page),pageSize:String(q.pageSize)});for(const key of ['search','unitId','status','dateFrom','dateTo','operational','period'] as const){const value=q[key];if(value)p.set(key,value);}return p.toString();}
 async list(q: AdminBookingsQuery){return page(await this.request('agendamentos?'+this.params(q)),q);}
 async daily(q: AdminBookingsQuery): Promise<AdminDailyBookings>{const o=object(await this.request('painel-do-dia?'+this.params(q))),counts=object(o.counts),agenda=page(o.agenda,q);const days=array(o.upcomingDays).map(v=>{const x=object(v);return {date:date(x.date),count:integer(x.count)};});if(days.length!==7||new Set(days.map(x=>x.date)).size!==7)throw new Error(failure);return {agenda,counts:{present:integer(counts.present),payments:integer(counts.payments),waiting:integer(counts.waiting),today:integer(counts.today),checkIns:integer(counts.checkIns)},firstPayment:o.firstPayment===null?null:adminBookingRecord(o.firstPayment),firstWaiting:o.firstWaiting===null?null:adminBookingRecord(o.firstWaiting),nextArrival:o.nextArrival===null?null:adminBookingRecord(o.nextArrival),upcomingDays:days};}
 async create(input: AdminBookingInput){const result=adminBookingRecord(await this.request('agendamentos','POST',{requestId:input.requestId,clientId:input.clientId,roomId:input.roomId,date:input.date,timeSlot:input.timeSlot,total:input.total,paymentStatus:input.paymentStatus}));if(result.booking.id!==input.requestId||result.booking.userId!==input.clientId||result.booking.roomId!==input.roomId||result.booking.date!==input.date||result.booking.timeSlot!==input.timeSlot)throw new Error(failure);return result;}
 async action(bookingId: string,action: 'confirmacao'|'pagamento'|'cancelamento'|'chegada',expectedVersion: string,reason?: string){if(!expectedVersion)throw new Error('Atualize a lista antes de alterar o agendamento.');const result=adminBookingRecord(await this.request('agendamentos/'+encodeURIComponent(bookingId)+'/'+action,'PATCH',{expectedVersion,...(action==='cancelamento'?{reason}:{})}));if(result.booking.id!==bookingId)throw new Error(failure);return result;}
 async searchClients(search: string): Promise<AdminClientOption[]>{const values=array(await this.request('clientes/busca?search='+encodeURIComponent(search)));if(values.length>50)throw new Error(failure);return values.map(v=>{const o=object(v);return {id:id(o.id),name:text(o.name,150),email:text(o.email,254)};});}
}
