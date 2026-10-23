// Fixtures próprias; não altera registros reais nem executa DDL.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPool } from 'mysql2/promise';
import { validateEnvironment } from './config/environment';
import { buildPoolOptions } from './database/database.service';
import { RepositorioAuditoriaMysql } from './repositories/mysql/repositorio-auditoria-mysql';
import { consultaAuditoria } from './services/servico-auditoria';
import { TokenSessao } from './security/token-sessao';
async function check(){
  if(process.env.NODE_ENV==='production')throw new Error('Somente local.');
  const config=validateEnvironment(process.env),pool=createPool(buildPoolOptions(config.db)),repo=new RepositorioAuditoriaMysql(config.db);
  const marker='Auditoria Teste '+randomUUID(),entity=randomUUID(),ids:string[]=[],users:string[]=[];
  const token=new TokenSessao();
  try{
    for(let i=0;i<35;i++){
      const id=randomUUID();ids.push(id);
      await pool.execute('INSERT INTO registros_auditoria(id,nome_usuario,acao,entidade,entidade_id,detalhes,ocorrido_em) VALUES(?,?,?,?,?,?,?)',[id,marker,'update','booking',entity,JSON.stringify({action:'cancelamento',manualRefund:true,token:'NUNCA-EXPOR',senha_hash:'NUNCA-EXPOR',email:'NUNCA-EXPOR'}),'2030-10-21 12:00:00.'+String(i%3).padStart(6,'0')]);
    }
    const query={search:marker,cursor:null};const first=await repo.listar(query);assert.equal(first.total,35);assert.equal(first.items.length,30);assert.ok(first.nextCursor);
    const next=await repo.listar(consultaAuditoria({search:marker,cursor:first.nextCursor}));assert.equal(next.items.length,5);assert.equal(next.nextCursor,null);assert.equal(new Set([...first.items,...next.items].map(item=>item.id)).size,35);
    assert.ok(first.items.every(item=>item.summary==='Cancelou agendamento · reembolso manual pela equipe'));assert.ok(!JSON.stringify(first).includes('NUNCA-EXPOR'));assert.equal(first.items[0]?.actorName,marker);
    const literal=marker+' %_!';const literalId=randomUUID();ids.push(literalId);await pool.execute("INSERT INTO registros_auditoria(id,nome_usuario,acao,entidade,entidade_id) VALUES(?,?,'historica','legado',?)",[literalId,literal,entity]);
    const exact=await repo.listar({search:literal,cursor:null});assert.equal(exact.total,1);assert.equal(exact.items[0]?.action,'historica');
    assert.equal((await repo.listar({search:randomUUID(),cursor:null})).total,0);
    // Testa a composição real da API com sessões descartáveis, sem login/logout do usuário.
    for(const role of ['client','secretaria','admin']){
      const user=randomUUID();users.push(user);const session=token.gerar();
      await pool.execute('INSERT INTO usuarios(id,perfil_id,nome,email,ativo) SELECT ?,id,?,?,1 FROM perfis WHERE codigo=?',[user,marker,user+'@example.invalid',role]);
      await pool.execute('INSERT INTO sessoes(id,usuario_id,token_hash,criado_em,ultima_atividade_em,expira_em) VALUES(?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 4 HOUR))',[randomUUID(),user,session.hash]);
      const response=await fetch(`http://${config.host}:${config.port}/admin/atividades?search=${encodeURIComponent(marker)}`,{headers:{Cookie:'c2w_session='+session.token}});
      assert.equal(response.status,role==='admin'?200:403);
      if(role==='admin'){assert.equal(response.headers.get('cache-control'),'no-store');const body=await response.text();assert.ok(!body.includes('NUNCA-EXPOR'));assert.ok(body.includes(marker));}
      await pool.execute('UPDATE sessoes SET revogado_em=UTC_TIMESTAMP(6) WHERE usuario_id=?',[user]);
      assert.equal((await fetch(`http://${config.host}:${config.port}/admin/atividades`,{headers:{Cookie:'c2w_session='+session.token}})).status,401);
    }
    console.info('Auditoria MySQL/HTTP: filtros literais, cursor com microssegundos/empates, histórico, projeção segura, admin, revogação e cache OK.');
  }finally{
    for(const id of ids)await pool.execute('DELETE FROM registros_auditoria WHERE id=? AND nome_usuario IN (?,?)',[id,marker,marker+' %_!']);
    for(const user of users){await pool.execute('DELETE FROM sessoes WHERE usuario_id=?',[user]);await pool.execute('DELETE FROM usuarios WHERE id=? AND nome=?',[user,marker]);}
    await repo.onModuleDestroy();await pool.end();
  }
}
void check().catch(()=>{console.error('Verificação de auditoria não concluída. Confira API local, ambiente e fixtures.');process.exitCode=1;});
