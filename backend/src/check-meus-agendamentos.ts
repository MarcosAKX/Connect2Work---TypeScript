// Somente fixtures aleatórias próprias; sem DDL nem alteração de dados reais.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { createPool, type RowDataPacket } from 'mysql2/promise';
import { validateEnvironment } from './config/environment';
import { buildPoolOptions } from './database/database.service';
import { RepositorioAgendamentosMysql } from './repositories/mysql/repositorio-agendamentos-mysql';
import { consultaMeusAgendamentos } from './services/validacao-meus-agendamentos';
import type { AtorAdministrativo } from './security/acesso-administrativo';
async function check(){
  if(process.env.NODE_ENV==='production')throw new Error('Somente local.');
  const config=validateEnvironment(process.env),pool=createPool(buildPoolOptions(config.db));
  const now=new Date('2030-10-20T11:00:00Z'),clock={agora:()=>now},repo=new RepositorioAgendamentosMysql(config.db,clock);
  const actors:AtorAdministrativo[]=Array.from({length:2},()=>({id:randomUUID(),name:'Teste Meus API',role:'client',tokenHash:createHash('sha256').update(randomBytes(32)).digest()}));
  const a=actors[0],b=actors[1];if(!a||!b)throw new Error('Fixture ausente.');
  const unit=randomUUID(),room=randomUUID(),ids:string[]=[],auditId=randomUUID();
  const insert=async(actor=a,start=new Date('2030-10-21T11:00:00Z'),paid=false,hours=0)=>{
    const id=randomUUID();ids.push(id);await pool.execute("INSERT INTO agendamentos(id,usuario_id,sala_id,inicio_em,fim_em,situacao_pagamento,valor_acordado,horas_do_plano) VALUES(?,?,?,?,?,?,50,?)",[id,actor.id,room,start,new Date(start.getTime()+3600000),paid?'concluido':'pendente',hours]);return id;
  };
  const find=async(id:string)=>{const [rows]=await pool.execute<RowDataPacket[]>("SELECT DATE_FORMAT(atualizado_em,'%Y-%m-%d %H:%i:%s.%f') version,situacao,situacao_pagamento FROM agendamentos WHERE id=?",[id]);if(!rows[0])throw new Error('Fixture ausente');return rows[0];};
  try{
    for(const actor of actors){await pool.execute("INSERT INTO usuarios(id,perfil_id,nome,email,ativo) SELECT ?,id,?,?,1 FROM perfis WHERE codigo='client'",[actor.id,actor.name,actor.id+'@example.invalid']);await pool.execute('INSERT INTO sessoes(id,usuario_id,token_hash,criado_em,ultima_atividade_em,expira_em) VALUES(?,?,?,?,?,?)',[randomUUID(),actor.id,actor.tokenHash,new Date(now.getTime()-60000),now,new Date(now.getTime()+3600000)]);}
    await pool.execute('INSERT INTO unidades(id,nome,endereco) VALUES(?,?,?)',[unit,'Teste Meus API','Teste']);await pool.execute('INSERT INTO salas(id,unidade_id,nome,capacidade,preco_por_hora) VALUES(?,?,?,4,50)',[room,unit,'Teste Meus API']);
    const paid=await insert(a,undefined,true),foreign=await insert(b),plan=await insert(a,undefined,false,1),near=await insert(a,new Date(now.getTime()+86400000-1)),past=await insert(a,new Date(now.getTime()-3600000));
    for(let i=0;i<21;i++)await insert();
    const first=await repo.listarMeus(a,{status:'upcoming',cursor:null});assert.equal(first.items.length,20);assert.equal(first.counts.upcoming,24);assert.equal(first.counts.past,1);assert.ok(first.nextCursor);
    const second=await repo.listarMeus(a,consultaMeusAgendamentos({status:'upcoming',cursor:first.nextCursor}));assert.equal(second.items.length,4);assert.equal(second.nextCursor,null);assert.equal(new Set([...first.items,...second.items].map(item=>item.booking.id)).size,24);assert.ok([...first.items,...second.items].every(item=>item.booking.userId===a.id));
    await assert.rejects(repo.cancelarMeu(a,foreign,String((await find(foreign)).version)),{status:404});
    for(const id of [plan,near,past])await assert.rejects(repo.cancelarMeu(a,id,String((await find(id)).version)),{status:409});
    await assert.rejects(repo.cancelarMeu(a,paid,'2000-01-01 00:00:00.000001'),{status:409});
    const version=String((await find(paid)).version);const canceled=await repo.cancelarMeu(a,paid,version);assert.equal(canceled.booking.status,'cancelled');assert.equal(canceled.booking.paymentStatus,'completed');await repo.cancelarMeu(a,paid,version);
    const [history]=await pool.execute<RowDataPacket[]>("SELECT detalhes FROM registros_auditoria WHERE entidade_id=? AND acao='update'",[paid]);assert.equal(history.length,1);const details=typeof history[0]?.detalhes==='string'?JSON.parse(history[0].detalhes):history[0]?.detalhes;assert.equal(details.manualRefund,true);
    const cancelled=await repo.listarMeus(a,{status:'cancelled',cursor:null});assert.equal(cancelled.counts.cancelled,1);assert.equal(cancelled.items[0]?.booking.id,paid);
    await pool.execute("INSERT INTO registros_auditoria(id,usuario_id,acao,entidade,entidade_id) VALUES(?,?,'teste','booking',?)",[auditId,a.id,paid]);const target=await insert();const broken=new RepositorioAgendamentosMysql(config.db,clock,()=>auditId);
    try{await assert.rejects(broken.cancelarMeu(a,target,String((await find(target)).version)));assert.equal((await find(target)).situacao,'pendente');}finally{await broken.onModuleDestroy();}
    await pool.execute('UPDATE sessoes SET revogado_em=? WHERE usuario_id=?',[now,a.id]);await assert.rejects(repo.cancelarMeu(a,target,String((await find(target)).version)),{status:401});
    console.info('Meus MySQL: isolamento, cursor, limite de 24h, pagamento preservado, plano bloqueado, idempotência, versão, rollback e revogação OK.');
  }finally{
    for(const id of ids){await pool.execute("DELETE FROM registros_auditoria WHERE entidade_id=? AND usuario_id IN (?,?)",[id,a.id,b.id]);await pool.execute('DELETE FROM agendamentos WHERE id=? AND usuario_id IN (?,?)',[id,a.id,b.id]);}
    await pool.execute('DELETE FROM registros_auditoria WHERE id=? AND usuario_id=?',[auditId,a.id]);await pool.execute('DELETE FROM salas WHERE id=?',[room]);await pool.execute('DELETE FROM unidades WHERE id=?',[unit]);
    for(const actor of actors){await pool.execute('DELETE FROM sessoes WHERE usuario_id=?',[actor.id]);await pool.execute('DELETE FROM usuarios WHERE id=?',[actor.id]);}
    await repo.onModuleDestroy();await pool.end();
  }
}
void check().catch(()=>{console.error('Verificação Meus não concluída; confira ambiente e fixtures.');process.exitCode=1;});
