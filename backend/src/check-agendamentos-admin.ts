// Somente validação local: IDs próprios, sem DDL; limpeza no finally.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { createPool, type RowDataPacket } from 'mysql2/promise';
import { validateEnvironment } from './config/environment';
import { buildPoolOptions } from './database/database.service';
import { RepositorioAgendamentosAdministrativosMysql } from './repositories/mysql/repositorio-agendamentos-administrativos-mysql';
import { consultaAgendamentos, criacaoAgendamento } from './services/validacao-agendamentos-administrativos';
async function check(): Promise<void> {
 if(process.env.NODE_ENV==='production')throw new Error('Somente validação local.');
 const config=validateEnvironment(process.env); const pool=createPool(buildPoolOptions(config.db)); const repo=new RepositorioAgendamentosAdministrativosMysql(config.db);
 const admin=randomUUID(),client=randomUUID(),secretary=randomUUID(),unit=randomUUID(),room=randomUUID(),room2=randomUUID();
 const users=[admin,client,secretary];const auditIds: string[]=[];const bookingIds: string[]=[];
 const tokenHash=createHash('sha256').update(randomBytes(32)).digest(); const secretHash=createHash('sha256').update(randomBytes(32)).digest();
 const actor={id:admin,name:'Admin Teste',role:'admin' as const,tokenHash}; const sec={id:secretary,name:'Equipe Teste',role:'secretaria' as const,tokenHash:secretHash};
 try {
  const seeds:Array<[string,string]>=[[admin,'admin'],[client,'client'],[secretary,'secretaria']];
  for(const [id,role] of seeds) {
   await pool.execute('INSERT INTO usuarios(id,perfil_id,nome,email,ativo) SELECT ?,id,?,?,1 FROM perfis WHERE codigo=?',[id,'Teste Agendamento',id+'@example.invalid',role]);
  }
  const sessionSeeds:Array<[string,Buffer]>=[[admin,tokenHash],[secretary,secretHash]];
  for(const [id,hash] of sessionSeeds) await pool.execute('INSERT INTO sessoes(id,usuario_id,token_hash,criado_em,ultima_atividade_em,expira_em) VALUES(?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 4 HOUR))',[randomUUID(),id,hash]);
  await pool.execute('INSERT INTO unidades(id,nome,endereco) VALUES(?,?,?)',[unit,'Teste Agendamento','Endereço Teste']);
  for(const id of [room,room2])await pool.execute('INSERT INTO salas(id,unidade_id,nome,capacidade,preco_por_hora) VALUES(?,?,?,4,50)',[id,unit,'Teste Agendamento']);
  function pedido(timeSlot='08:00 - 10:00',roomId=room) {const requestId=randomUUID();bookingIds.push(requestId);return criacaoAgendamento({requestId,clientId:client,roomId,date:'2030-10-20',timeSlot,total:'100.01',paymentStatus:'pending'});}
  const a=pedido(),b=pedido();const race=await Promise.allSettled([repo.criar(actor,a),repo.criar(actor,b)]);
  assert.equal(race.filter(x=>x.status==='fulfilled').length,1);assert.equal(race.filter(x=>x.status==='rejected').length,1);
  const accepted=race[0]?.status==='fulfilled'?a:b;const same=await repo.criar(actor,accepted);assert.equal(same.criada,false);assert.equal(same.item.total,100.01);
  await assert.rejects(repo.criar(sec,accepted));
  await repo.criar(actor,pedido('10:00 - 11:00'));await repo.criar(actor,pedido('08:00 - 10:00',room2));
  const q=consultaAgendamentos({unitId:unit,pageSize:'1'});const page=await repo.listar(actor,q);assert.equal(page.total,3);assert.equal(page.items.length,1);assert.equal(page.summary.total,3);
  const privatePage=await repo.listar(sec,q);assert.equal('total' in (privatePage.items[0]?.booking??{}),false);assert.equal('total' in (privatePage.items[0]??{}),false);assert.equal('revenue' in privatePage.summary,false);
  const record=same.item;const cancelled=await repo.alterar(actor,record.booking.id,'cancelamento',record.booking.version,'Teste de cancelamento');assert.equal(cancelled.adminStatus,'cancelled');
  await assert.rejects(repo.alterar(actor,record.booking.id,'pagamento',cancelled.booking.version,''));
  const replay=await repo.criar(actor,accepted);assert.equal(replay.item.adminStatus,'cancelled');assert.equal(replay.criada,false);
  await repo.criar(actor,pedido());
  const toPay=await repo.criar(actor,pedido('12:00 - 13:00'));const paid=await repo.alterar(sec,toPay.item.booking.id,'pagamento',toPay.item.booking.version,'');assert.equal(paid.booking.paymentStatus,'completed');assert.equal(paid.total,undefined);
  await assert.rejects(repo.alterar(actor,toPay.item.booking.id,'cancelamento',toPay.item.booking.version,'Versão antiga'));
  const duplicateAudit=randomUUID();auditIds.push(duplicateAudit);await pool.execute("INSERT INTO registros_auditoria(id,usuario_id,acao,entidade,entidade_id) VALUES(?,?,'create','booking',?)",[duplicateAudit,admin,randomUUID()]);
  const faulty=new RepositorioAgendamentosAdministrativosMysql(config.db,undefined,()=>duplicateAudit);const rollback=pedido('14:00 - 15:00');
  try {await assert.rejects(faulty.criar(actor,rollback));}finally{await faulty.onModuleDestroy();}
  const [missing]=await pool.execute<RowDataPacket[]>('SELECT id FROM agendamentos WHERE id=?',[rollback.requestId]);assert.equal(missing.length,0);
  const panel=await repo.painel(actor,consultaAgendamentos({unitId:unit}));assert.equal(panel.agenda.total,0);
  const fixedNow=new Date('2030-10-20T15:00:00Z');
  await pool.execute('UPDATE sessoes SET criado_em=?,ultima_atividade_em=?,expira_em=? WHERE usuario_id IN (?,?)',[new Date(fixedNow.getTime()-60000),new Date(fixedNow.getTime()-60000),new Date(fixedNow.getTime()+3600000),admin,secretary]);
  const timed=new RepositorioAgendamentosAdministrativosMysql(config.db,{agora:()=>fixedNow});
  try {
    const current=await timed.listar(actor,consultaAgendamentos({unitId:unit,dateFrom:'2030-10-20',dateTo:'2030-10-20'}));
    const target=current.items.find(x=>x.booking.id===toPay.item.booking.id);assert.ok(target);
    const arrived=await timed.alterar(sec,target.booking.id,'chegada',target.booking.version,'');assert.equal(arrived.booking.checkedInBy,secretary);
    await assert.rejects(timed.alterar(actor,target.booking.id,'chegada',arrived.booking.version,''));
    const daily=await timed.painel(actor,consultaAgendamentos({unitId:unit,pageSize:'1',operational:'present'}));assert.equal(daily.counts.present,1);assert.equal(daily.agenda.items.length,1);assert.equal(daily.agenda.items[0]?.booking.id,target.booking.id);assert.equal(daily.counts.checkIns,1);
    await pool.execute('UPDATE agendamentos SET horas_do_plano=1 WHERE id=?',[target.booking.id]);
    await assert.rejects(timed.alterar(actor,target.booking.id,'cancelamento',arrived.booking.version,'Plano não integrado'));
    await pool.execute('UPDATE sessoes SET revogado_em=? WHERE usuario_id=?',[fixedNow,admin]);
    await assert.rejects(timed.alterar(actor,target.booking.id,'pagamento',arrived.booking.version,''));
  }finally{await timed.onModuleDestroy();}
  console.info('Agendamentos admin: concorrência, adjacência, idempotência, redaction, versões, pagamento manual, cancelamento e rollback aprovados.');
 } finally {
  for(const id of bookingIds) {await pool.execute("DELETE FROM registros_auditoria WHERE entidade='booking' AND entidade_id=? AND usuario_id IN (?,?)",[id,admin,secretary]);await pool.execute('DELETE FROM agendamentos WHERE id=? AND usuario_id=?',[id,client]);}
  for(const id of auditIds)await pool.execute('DELETE FROM registros_auditoria WHERE id=? AND usuario_id=?',[id,admin]);
  for(const id of [room,room2])await pool.execute('DELETE FROM salas WHERE id=?',[id]);await pool.execute('DELETE FROM unidades WHERE id=?',[unit]);
  for(const id of users){await pool.execute('DELETE FROM sessoes WHERE usuario_id=?',[id]);await pool.execute('DELETE FROM usuarios WHERE id=?',[id]);}
  await repo.onModuleDestroy();await pool.end();
 }
}
void check().catch(()=>{console.error('Verificação local de agendamentos não concluída; confira o ambiente e as fixtures.');process.exitCode=1;});
