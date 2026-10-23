import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApplication } from '../src/application';
import { validarConfigAutenticacao } from '../src/config/auth-environment';
import { ServicoAgendamentos } from '../src/services/servico-agendamentos';
import { AcessoAdministrativo } from '../src/security/acesso-administrativo';
import { TokenSessao } from '../src/security/token-sessao';
import type { RepositorioAgendamentos } from '../src/repositories/contracts/repositorio-agendamentos';

test('Meus HTTP: sessão, papel, proprietário da sessão, CSRF e respostas sanitizadas',async()=>{
  const token=new TokenSessao().gerar().token,userId=randomUUID(),id=randomUUID();let logged=true,role:'client'|'admin'='client',broken=false,calls=0;
  const access=new AcessoAdministrativo({async consultar(){return logged?{user:{id:userId,name:'Cliente',email:'client@example.invalid',role,active:true,profession:'',phone:'',createdAt:'2026-10-21T12:00:00Z',hasHoursPlan:false,hoursBalance:0},idleExpiresAt:'',absoluteExpiresAt:''}:null;}});
  const repo:RepositorioAgendamentos={
    async consultarDia(){throw new Error('Não utilizado');},async criarPendente(){throw new Error('Não utilizado');},
    async listarMeus(actor,q){calls++;assert.equal(actor.id,userId);assert.equal(q.status,'upcoming');if(broken)throw new Error('SQL-PRIVADO');return {items:[],counts:{upcoming:0,past:0,cancelled:0},nextCursor:null,serverNow:'2026-10-21T12:00:00Z'};},
    async cancelarMeu(actor,target,version){calls++;assert.equal(actor.id,userId);assert.equal(target,id);assert.equal(version,'2026-10-21 12:00:00.000001');return {roomName:'Sala',unitName:'Unidade',booking:{id,userId,roomId:id,unitId:id,date:'2030-10-21',timeSlot:'08:00 - 09:00',status:'cancelled',adminStatus:'cancelled',paymentStatus:'completed',total:50,hoursFromPlan:0,createdAt:'2026-10-21T12:00:00Z',version,clientCanCancel:false}};},
  };
  const app=await createApplication({async isReady(){return true;}},undefined,undefined,undefined,undefined,{service:new ServicoAgendamentos(repo,access),config:validarConfigAutenticacao({})});
  try{
    await app.listen(0,'127.0.0.1');const url=await app.getUrl();const headers={Cookie:'c2w_session='+token,Origin:'http://127.0.0.1:5173','Content-Type':'application/json','X-C2W-Request':'1'};
    const read=(query='')=>fetch(url+'/agendamentos/meus'+query,{headers});const body={expectedVersion:'2026-10-21 12:00:00.000001'};
    const write=(input:unknown=body,h=headers)=>fetch(url+'/agendamentos/'+id+'/cancelamento',{method:'POST',headers:h,body:JSON.stringify(input)});
    assert.equal((await fetch(url+'/agendamentos/meus')).status,401);assert.equal(calls,0);
    assert.equal((await read('?userId='+id)).status,400);assert.equal((await read('?status=other')).status,400);assert.equal(calls,0);
    const response=await read();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.text()).includes('email'),false);
    assert.equal((await write({...body,userId:id})).status,400);assert.equal((await write(body,{...headers,Origin:'https://outro.invalid'})).status,403);
    const canceled=await write();assert.equal(canceled.status,201);assert.equal((await canceled.json()).booking.paymentStatus,'completed');
    role='admin';const before=calls;assert.equal((await read()).status,403);assert.equal((await write()).status,403);assert.equal(calls,before);
    role='client';logged=false;assert.equal((await write()).status,401);
    logged=true;broken=true;const fail=await read();assert.equal(fail.status,503);assert.equal((await fail.text()).includes('SQL-PRIVADO'),false);
  }finally{await app.close();}
});
