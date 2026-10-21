import { ConflictException, NotFoundException, ForbiddenException, type OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createPool, type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import type { DatabaseConfig } from '../../config/environment';
import { buildPoolOptions } from '../../database/database.service';
import { bancoAdministrativo } from './banco-administrativo';
import { bloquearAcessoAdministrativo } from '../../security/transacao-administrativa';
import type { AtorAdministrativo } from '../../security/acesso-administrativo';
import { RelogioSistema, type Relogio } from '../../security/relogio';
import { dataComercial, instanteComercial } from '../../domain/horario-comercial';
import { PeriodoAgendamento } from '../../domain/periodo-agendamento';
import type { RepositorioAgendamentosAdministrativos } from '../contracts/repositorio-agendamentos-administrativos';
import type { ConsultaAgendamentos, PedidoAdministrativo, LinhaAgendamento, PaginaAgendamentos, ResumoAgendamentos, AcaoAgendamento } from '../../dto/agendamento-administrativo.dto';
interface Row extends RowDataPacket { id: string; usuario_id: string; sala_id: string; unidade_id: string; cliente_nome: string; sala_nome: string; unidade_nome: string; inicio_em: Date; fim_em: Date; situacao: string; situacao_pagamento: string; valor_acordado: string; horas_do_plano: string; criado_em: Date; chegada_em: Date|null; chegada_por: string|null; cancelado_em: Date|null; motivo_cancelamento: string|null; versao: string; }
interface Aggregate extends RowDataPacket { total: number; confirmed: number; pending: number; cancelled: number; today: number; checkInsToday: number; revenue: string|null; present: number; payments: number; waiting: number; }
const JOIN=' FROM agendamentos b JOIN usuarios u ON u.id=b.usuario_id JOIN salas s ON s.id=b.sala_id JOIN unidades n ON n.id=s.unidade_id ';
const SELECT="SELECT b.*,s.unidade_id,u.nome cliente_nome,s.nome sala_nome,n.nome unidade_nome,DATE_FORMAT(b.atualizado_em,'%Y-%m-%d %H:%i:%s.%f') versao";
function hour(d: Date): string {return new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);}
export class RepositorioAgendamentosAdministrativosMysql implements RepositorioAgendamentosAdministrativos, OnModuleDestroy {
 private readonly pool: Pool;
 constructor(config: DatabaseConfig,private readonly relogio: Relogio=new RelogioSistema(),private readonly novoId: ()=>string=randomUUID){this.pool=createPool(buildPoolOptions(config));}
 async onModuleDestroy(){await this.pool.end();}
 private dto(row: Row,actor: AtorAdministrativo,now: Date): LinhaAgendamento {
  const adminStatus: LinhaAgendamento['adminStatus']=row.situacao==='cancelado'?'cancelled':row.situacao==='confirmado'?'confirmed':'pending';
  const booking={id:row.id,userId:row.usuario_id,unitId:row.unidade_id,roomId:row.sala_id,date:dataComercial(row.inicio_em),timeSlot:`${hour(row.inicio_em)} - ${hour(row.fim_em)}`,status:adminStatus==='cancelled'?'cancelled' as const:row.fim_em<=now?'past' as const:'upcoming' as const,adminStatus,paymentStatus:row.situacao_pagamento==='concluido'?'completed' as const:'pending' as const,hoursFromPlan:Number(row.horas_do_plano),createdAt:row.criado_em.toISOString(),version:row.versao,...(actor.role==='admin'?{total:Number(row.valor_acordado)}:{}),...(row.chegada_em?{checkedInAt:row.chegada_em.toISOString(),checkedInBy:row.chegada_por??''}:{}),...(row.cancelado_em?{cancelledAt:row.cancelado_em.toISOString()}:{}),...(row.motivo_cancelamento?{cancellationReason:row.motivo_cancelamento}:{})};
  return {booking,clientName:row.cliente_nome,roomName:row.sala_nome,unitName:row.unidade_nome,...(actor.role==='admin'?{total:Number(row.valor_acordado)}:{}),adminStatus};
 }
 private async rows(c: PoolConnection,where: string,params: Array<string|number|Date>,limit: string): Promise<Row[]> {const [rows]=await c.execute<Row[]>({sql:SELECT+JOIN+' WHERE '+where+' ORDER BY b.inicio_em,b.id '+limit,timeout:2000},params);return rows;}
 private where(q: ConsultaAgendamentos,now: Date,daily=false): {sql: string; values: Array<string|number|Date>} {
  const clauses=['1=1']; const values:Array<string|number|Date>=[];
  if(q.unitId){clauses.push('s.unidade_id=?');values.push(q.unitId);}
  if(q.search){clauses.push('(LOCATE(?,u.nome)>0 OR LOCATE(?,s.nome)>0 OR LOCATE(?,n.nome)>0 OR LOCATE(?,b.id)>0)');values.push(q.search,q.search,q.search,q.search);}
  if(q.status){clauses.push('b.situacao=?');values.push(q.status==='pending'?'pendente':q.status==='confirmed'?'confirmado':'cancelado');}
  const from=daily?dataComercial(now):q.dateFrom,to=daily?dataComercial(now):q.dateTo;
  if(from){clauses.push('b.inicio_em>=?');values.push(instanteComercial(from,'08:00'));}
  if(to){clauses.push('b.inicio_em<?');values.push(instanteComercial(to,'21:00'));}
  if(daily){
   const operations:Record<string,string>={waiting:"b.situacao='confirmado' AND b.chegada_em IS NULL",present:"b.situacao='confirmado' AND b.chegada_em IS NOT NULL AND b.inicio_em<=? AND b.fim_em>?",payment:"b.situacao<>'cancelado' AND b.situacao_pagamento='pendente'",'checked-in':'b.chegada_em IS NOT NULL',cancelled:"b.situacao='cancelado'"};
   if(q.operational!=='all'){clauses.push(operations[q.operational]??'0=1');if(q.operational==='present')values.push(now,now);}
   const today=dataComercial(now),noon=instanteComercial(today,'12:00');
   if(q.period==='morning'){clauses.push('b.inicio_em<?');values.push(noon);}
   if(q.period==='afternoon'){clauses.push('b.inicio_em>=?');values.push(noon);}
   if(q.period==='next'){clauses.push('b.inicio_em>=? AND b.inicio_em<=?');values.push(now,new Date(now.getTime()+180*60000));}
  }
  return {sql:clauses.map(x=>'('+x+')').join(' AND '),values};
 }
 private async page(c: PoolConnection,actor: AtorAdministrativo,q: ConsultaAgendamentos,now: Date,daily=false): Promise<PaginaAgendamentos> {
  const where=this.where(q,now,daily),today=dataComercial(now),start=instanteComercial(today,'08:00'),end=instanteComercial(today,'21:00');
  const [counts]=await c.execute<Aggregate[]>({sql:`SELECT COUNT(*) total,SUM(b.situacao='confirmado') confirmed,SUM(b.situacao='pendente') pending,SUM(b.situacao='cancelado') cancelled,SUM(b.inicio_em>=? AND b.inicio_em<?) today,SUM(b.inicio_em>=? AND b.inicio_em<? AND b.chegada_em IS NOT NULL) checkInsToday,SUM(CASE WHEN b.situacao='confirmado' AND b.situacao_pagamento='concluido' THEN b.valor_acordado ELSE 0 END) revenue`+JOIN+' WHERE '+where.sql,timeout:2000},[start,end,start,end,...where.values]);
  const a=counts[0];if(!a)throw new Error('Resumo ausente');
  const summary:ResumoAgendamentos={total:Number(a.total),confirmed:Number(a.confirmed??0),pending:Number(a.pending??0),cancelled:Number(a.cancelled??0),today:Number(a.today??0),checkInsToday:Number(a.checkInsToday??0),...(actor.role==='admin'?{revenue:Number(a.revenue??0)}:{})};
  const rows=await this.rows(c,where.sql,where.values,`LIMIT ${q.pageSize} OFFSET ${(q.page-1)*q.pageSize}`);
  return {items:rows.map(row=>this.dto(row,actor,now)),total:summary.total,page:q.page,pageSize:q.pageSize,summary,today,serverNow:now.toISOString()};
 }
 async listar(actor: AtorAdministrativo,q: ConsultaAgendamentos){return bancoAdministrativo(this.pool,c=>this.page(c,actor,q,this.relogio.agora()));}
 async painel(actor: AtorAdministrativo,q: ConsultaAgendamentos){return bancoAdministrativo(this.pool,async c=>{
  const now=this.relogio.agora(),today=dataComercial(now),start=instanteComercial(today,'08:00'),end=instanteComercial(today,'21:00');
  const agenda=await this.page(c,actor,q,now,true);
  const base='b.inicio_em>=? AND b.inicio_em<?'; const params=[start,end];
  const [counts]=await c.execute<Aggregate[]>({sql:`SELECT COUNT(*) today,SUM(b.chegada_em IS NOT NULL) checkInsToday,SUM(b.situacao='confirmado' AND b.chegada_em IS NOT NULL AND b.inicio_em<=? AND b.fim_em>?) present,SUM(b.situacao<>'cancelado' AND b.situacao_pagamento='pendente') payments,SUM(b.situacao='confirmado' AND b.chegada_em IS NULL) waiting`+JOIN+' WHERE '+base,timeout:2000},[now,now,...params]);
  const a=counts[0];if(!a)throw new Error('Resumo ausente');
  const first=async(extra: string,values:Array<string|Date>=[])=>{const rows=await this.rows(c,base+' AND '+extra,[...params,...values],'LIMIT 1');return rows[0]?this.dto(rows[0],actor,now):null;};
  const firstPayment=await first("b.situacao<>'cancelado' AND b.situacao_pagamento='pendente'");
  const firstWaiting=await first("b.situacao='confirmado' AND b.chegada_em IS NULL");
  const nextArrival=await first("b.situacao='confirmado' AND b.chegada_em IS NULL AND b.inicio_em>=?",[now]);
  const firstDate=new Date(today+'T12:00:00Z');
  const dates=Array.from({length:7},(_,i)=>{const d=new Date(firstDate);d.setUTCDate(d.getUTCDate()+i+1);return d.toISOString().slice(0,10);});
  const ranges=dates.map(date=>({date,start:instanteComercial(date,'08:00'),end:instanteComercial(date,'21:00')}));
  const paramsDays=ranges.flatMap(range=>[range.start,range.end]);
  const [dayCounts]=await c.execute<RowDataPacket[]>({sql:'SELECT '+ranges.map((_,i)=>`SUM(inicio_em>=? AND inicio_em<?) day${i}`).join(',')+" FROM agendamentos WHERE situacao<>'cancelado' AND inicio_em>=? AND inicio_em<?",timeout:2000},[...paramsDays,ranges[0]?.start??start,ranges[6]?.end??end]);
  const upcomingDays=ranges.map((range,i)=>({date:range.date,count:Number(dayCounts[0]?.['day'+i]??0)}));
  return {agenda,counts:{present:Number(a.present??0),payments:Number(a.payments??0),waiting:Number(a.waiting??0),today:Number(a.today),checkIns:Number(a.checkInsToday??0)},firstPayment,firstWaiting,nextArrival,upcomingDays};
 });}
 private async one(c: PoolConnection,id: string,lock=false): Promise<Row|null>{const [rows]=await c.execute<Row[]>({sql:SELECT+JOIN+' WHERE b.id=?'+(lock?' FOR UPDATE':''),timeout:2000},[id]);return rows[0]??null;}
 private async audit(c: PoolConnection,actor: AtorAdministrativo,id: string,action: string,details: object,now: Date){await c.execute({sql:'INSERT INTO registros_auditoria(id,usuario_id,nome_usuario,acao,entidade,entidade_id,detalhes,ocorrido_em) VALUES(?,?,?,?,?,?,?,?)',timeout:2000},[this.novoId(),actor.id,actor.name,action,'booking',id,JSON.stringify(details),now]);}
 async criar(actor: AtorAdministrativo,p: PedidoAdministrativo){return bancoAdministrativo(this.pool,async c=>{
  await c.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();
  try {
   const access=await bloquearAcessoAdministrativo(c,actor,this.relogio,[p.clientId],['admin','secretaria']);
   const before=await this.one(c,p.requestId);
   if(before){
    const [history]=await c.execute<RowDataPacket[]>("SELECT usuario_id,detalhes FROM registros_auditoria WHERE entidade='booking' AND entidade_id=? AND acao='create' ORDER BY ocorrido_em LIMIT 1",[p.requestId]);
    const original=history[0];const details=original?.detalhes;const payment=details&&typeof details==='object'&&'paymentStatus' in details?details.paymentStatus:null;
    if(original?.usuario_id!==actor.id||before.usuario_id!==p.clientId||before.sala_id!==p.roomId||dataComercial(before.inicio_em)!==p.date||`${hour(before.inicio_em)} - ${hour(before.fim_em)}`!==p.timeSlot||Math.round(Number(before.valor_acordado)*100)!==p.centavos||payment!==p.paymentStatus)throw new ConflictException('Pedido incompatível. Atualize a lista.');
    await c.commit();return {item:this.dto(before,actor,this.relogio.agora()),criada:false};
   }
   const [clients]=await c.execute<RowDataPacket[]>('SELECT u.id FROM usuarios u JOIN perfis p ON p.id=u.perfil_id WHERE u.id=? AND u.ativo=1 AND p.codigo=\'client\'',[p.clientId]);
   if(!clients.length)throw new ConflictException('Selecione um cliente ativo.');
   const [rooms]=await c.execute<RowDataPacket[]>('SELECT id FROM salas WHERE id=? FOR UPDATE',[p.roomId]);if(!rooms.length)throw new NotFoundException('Sala não encontrada.');
   const current=await bloquearAcessoAdministrativo(c,actor,this.relogio,[p.clientId],['admin','secretaria']);const period=PeriodoAgendamento.criar(p.date,p.timeSlot);period.validarInicioFuturo(current.agora);
   const [conflicts]=await c.execute<RowDataPacket[]>("SELECT id FROM agendamentos WHERE sala_id=? AND situacao<>'cancelado' AND inicio_em<? AND fim_em>? LIMIT 1",[p.roomId,period.fim,period.inicio]);
   if(conflicts.length)throw new ConflictException('Este horário já está ocupado. Escolha outro período.');
   await c.execute('INSERT INTO agendamentos(id,usuario_id,sala_id,inicio_em,fim_em,situacao,situacao_pagamento,valor_acordado,horas_do_plano,criado_em,atualizado_em) VALUES(?,?,?,?,?,?,?,?,0,?,?)',[p.requestId,p.clientId,p.roomId,period.inicio,period.fim,'confirmado',p.paymentStatus==='completed'?'concluido':'pendente',(p.centavos/100).toFixed(2),current.agora,current.agora]);
   await this.audit(c,{...actor,name:access.name},p.requestId,'create',{source:'administracao',paymentStatus:p.paymentStatus,manualPayment:p.paymentStatus==='completed',clientId:p.clientId,roomId:p.roomId,total:(p.centavos/100).toFixed(2)},current.agora);
   const row=await this.one(c,p.requestId);if(!row)throw new Error('Reserva ausente');await c.commit();return {item:this.dto(row,actor,current.agora),criada:true};
  }catch(error:unknown){await c.rollback();throw error;}
 });}
 async alterar(actor: AtorAdministrativo,id: string,action: AcaoAgendamento,version: string,reason: string){return bancoAdministrativo(this.pool,async c=>{
  await c.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();
  try {
   const access=await bloquearAcessoAdministrativo(c,actor,this.relogio,[],['admin','secretaria']);const row=await this.one(c,id,true);if(!row)throw new NotFoundException('Agendamento não encontrado.');
   const current=await bloquearAcessoAdministrativo(c,actor,this.relogio,[],['admin','secretaria']);
   if(row.versao!==version)throw new ConflictException('Este agendamento foi alterado. Atualize a lista.');
   if(row.situacao==='cancelado')throw new ConflictException('Agendamento cancelado.');
   let sql='';let values:Array<string|Date>=[];
   if(action==='confirmacao'){if(row.situacao==='confirmado'){await c.commit();return this.dto(row,actor,current.agora);}if(row.inicio_em<=current.agora)throw new ConflictException('O período já foi iniciado.');sql="situacao='confirmado'";}
   if(action==='pagamento'){if(row.situacao_pagamento==='concluido'){await c.commit();return this.dto(row,actor,current.agora);}sql="situacao_pagamento='concluido'";}
   if(action==='cancelamento'){if(Number(row.horas_do_plano)>0)throw new ConflictException('Cancelamento com estorno de horas ainda não integrado.');sql="situacao='cancelado',cancelado_em=?,motivo_cancelamento=?";values=[current.agora,reason];}
   if(action==='chegada'){
    if(row.situacao!=='confirmado')throw new ConflictException('Confirme o agendamento antes do check-in.');
    if(row.chegada_em)throw new ConflictException('Check-in já realizado.');
    if(dataComercial(row.inicio_em)!==dataComercial(current.agora)||row.fim_em<=current.agora)throw new ConflictException('Check-in permitido somente no dia e antes do término.');
    sql='chegada_em=?,chegada_por=?';values=[current.agora,actor.id];
   }
   if(!sql)throw new ForbiddenException('Ação inválida.');
   await c.execute('UPDATE agendamentos SET '+sql+',atualizado_em=GREATEST(?,TIMESTAMPADD(MICROSECOND,1,atualizado_em)) WHERE id=?',[...values,current.agora,id]);
   await this.audit(c,{...actor,name:access.name},id,'update',{source:'administracao',action,manualPayment:action==='pagamento',...(reason?{reason}:{})},current.agora);
   const updated=await this.one(c,id);if(!updated)throw new Error('Reserva ausente');await c.commit();return this.dto(updated,actor,current.agora);
  }catch(error:unknown){await c.rollback();throw error;}
 });}
}
