// Fixtures aleatórias próprias. Não usa reservas reais como alvo e não executa DDL.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { createPool, type RowDataPacket } from 'mysql2/promise';
import { validateEnvironment } from './config/environment';
import { buildPoolOptions } from './database/database.service';
import { RepositorioAgendamentosMysql } from './repositories/mysql/repositorio-agendamentos-mysql';
import { RepositorioAgendamentosAdministrativosMysql } from './repositories/mysql/repositorio-agendamentos-administrativos-mysql';
import { PeriodoAgendamento } from './domain/periodo-agendamento';
import type { AtorAdministrativo } from './security/acesso-administrativo';
async function check() {
  if (process.env.NODE_ENV==='production') throw new Error('Somente ambiente local.');
  const config=validateEnvironment(process.env); const pool=createPool(buildPoolOptions(config.db));
  const repo=new RepositorioAgendamentosMysql(config.db), adminRepo=new RepositorioAgendamentosAdministrativosMysql(config.db);
  const unit=randomUUID(), rooms=[randomUUID(),randomUUID()], ids:string[]=[], auditId=randomUUID();
  const actors:AtorAdministrativo[]=Array.from({length:3},(_,i)=>({id:randomUUID(),name:'Teste Cliente API',role:i===2?'admin':'client',tokenHash:createHash('sha256').update(randomBytes(32)).digest()}));
  const a=actors[0],b=actors[1],admin=actors[2],room=rooms[0],room2=rooms[1]; if(!a||!b||!admin||!room||!room2)throw new Error('Fixtures inválidas');
  const pedido=(timeSlot='08:00 - 10:00',roomId=room)=>{const requestId=randomUUID();ids.push(requestId);return {requestId,roomId,periodo:PeriodoAgendamento.criar('2030-10-21',timeSlot)};};
  try {
    for(const actor of actors){
      await pool.execute('INSERT INTO usuarios(id,perfil_id,nome,email,ativo) SELECT ?,id,?,?,1 FROM perfis WHERE codigo=?',[actor.id,actor.name,actor.id+'@example.invalid',actor.role]);
      await pool.execute('INSERT INTO sessoes(id,usuario_id,token_hash,criado_em,ultima_atividade_em,expira_em) VALUES(?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 4 HOUR))',[randomUUID(),actor.id,actor.tokenHash]);
    }
    await pool.execute('INSERT INTO unidades(id,nome,endereco) VALUES(?,?,?)',[unit,'Teste Cliente API','Teste']);
    for(const id of rooms)await pool.execute('INSERT INTO salas(id,unidade_id,nome,capacidade,preco_por_hora) VALUES(?,?,?,4,50.25)',[id,unit,'Teste Cliente API']);
    const p=pedido(),q=pedido(); const race=await Promise.allSettled([repo.criarPendente(a,p),repo.criarPendente(b,q)]);
    assert.equal(race.filter(x=>x.status==='fulfilled').length,1);
    const actor=race[0]?.status==='fulfilled'?a:b, accepted=race[0]?.status==='fulfilled'?p:q;
    const replay=await repo.criarPendente(actor,accepted);
    assert.equal(replay.criada,false); assert.equal(replay.reserva.total,100.5); assert.equal(replay.reserva.hoursFromPlan,0); assert.equal(replay.reserva.adminStatus,'pending'); assert.equal(replay.reserva.paymentStatus,'pending');
    await assert.rejects(repo.criarPendente(actor.id===a.id?b:a,accepted),{status:409});
    await assert.rejects(repo.criarPendente(actor,{...accepted,periodo:PeriodoAgendamento.criar('2030-10-21','08:00 - 11:00')}),{status:409});
    const adjacent=await repo.criarPendente(a,pedido('10:00 - 11:00')); assert.equal(adjacent.reserva.total,50.25);
    const mixed=pedido('08:00 - 10:00',room2), other=pedido('08:00 - 10:00',room2);
    const mixedRace=await Promise.allSettled([repo.criarPendente(a,mixed),adminRepo.criar(admin,{requestId:other.requestId,roomId:room2,clientId:b.id,date:'2030-10-21',timeSlot:'08:00 - 10:00',centavos:10050,paymentStatus:'pending'})]);
    assert.equal(mixedRace.filter(x=>x.status==='fulfilled').length,1);
    await pool.execute("UPDATE agendamentos SET situacao='cancelado' WHERE id=?",[accepted.requestId]);
    assert.equal((await repo.criarPendente(actor,accepted)).reserva.adminStatus,'cancelled');
    await repo.criarPendente(a,pedido());
    await pool.execute("INSERT INTO registros_auditoria(id,usuario_id,acao,entidade,entidade_id) VALUES(?,?,'teste','booking',?)",[auditId,a.id,randomUUID()]);
    const faulty=new RepositorioAgendamentosMysql(config.db,undefined,()=>auditId), rollback=pedido('14:00 - 15:00');
    try{await assert.rejects(faulty.criarPendente(a,rollback));}finally{await faulty.onModuleDestroy();}
    const [missing]=await pool.execute<RowDataPacket[]>('SELECT id FROM agendamentos WHERE id=?',[rollback.requestId]);assert.equal(missing.length,0);
    const [audit]=await pool.execute<RowDataPacket[]>("SELECT id FROM registros_auditoria WHERE entidade='booking' AND entidade_id=? AND acao='create'",[accepted.requestId]);assert.equal(audit.length,1);
    const period=PeriodoAgendamento.criar('2030-10-21','08:00 - 09:00');
    const day=await repo.consultarDia(room,period.inicio,new Date('2030-10-22T00:00:00Z'));assert.ok(day);assert.equal(day.precoDecimal,'50.25');assert.ok(day.ocupados.length>=2);
    // O relógio avança entre a checagem inicial e a aquisição da sala.
    const before=new Date('2030-10-21T10:59:59Z'),after=new Date('2030-10-21T11:00:00Z');
    await pool.execute('UPDATE sessoes SET criado_em=?,ultima_atividade_em=?,expira_em=? WHERE usuario_id=?',[new Date(before.getTime()-60000),before,new Date(after.getTime()+3600000),a.id]);
    let calls=0;const timed=new RepositorioAgendamentosMysql(config.db,{agora:()=>++calls===1?before:after});
    const stale=pedido('08:00 - 09:00',room2);
    try{await assert.rejects(timed.criarPendente(a,stale),{status:400});assert.equal((await timed.criarPendente(a,accepted).catch(()=>null))?.criada,actor.id===a.id?false:undefined);}finally{await timed.onModuleDestroy();}
    await pool.execute('UPDATE sessoes SET revogado_em=? WHERE usuario_id=?',[after,a.id]);
    await assert.rejects(repo.criarPendente(a,pedido('18:00 - 19:00')),{status:401});
    console.info('Cliente MySQL: concorrência cliente/admin, adjacência, preço do servidor, idempotência, cancelamento, rollback, tempo e sessão OK.');
  } finally {
    for(const id of ids){await pool.execute("DELETE FROM registros_auditoria WHERE entidade='booking' AND entidade_id=? AND usuario_id IN (?,?,?)",[id,...actors.map(x=>x.id)]);await pool.execute('DELETE FROM agendamentos WHERE id=? AND usuario_id IN (?,?)',[id,a.id,b.id]);}
    await pool.execute('DELETE FROM registros_auditoria WHERE id=? AND usuario_id=?',[auditId,a.id]);
    for(const id of rooms)await pool.execute('DELETE FROM salas WHERE id=?',[id]);await pool.execute('DELETE FROM unidades WHERE id=?',[unit]);
    for(const actor of actors){await pool.execute('DELETE FROM sessoes WHERE usuario_id=?',[actor.id]);await pool.execute('DELETE FROM usuarios WHERE id=?',[actor.id]);}
    await repo.onModuleDestroy();await adminRepo.onModuleDestroy();await pool.end();
  }
}
void check().catch(()=>{console.error('Verificação local não concluída; confira ambiente e fixtures.');process.exitCode=1;});

