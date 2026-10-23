import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApplication } from '../src/application';
import { validarConfigAutenticacao } from '../src/config/auth-environment';
import { ServicoAgendamentos } from '../src/services/servico-agendamentos';
import { AcessoAdministrativo } from '../src/security/acesso-administrativo';
import { TokenSessao } from '../src/security/token-sessao';
import type { RepositorioAgendamentos } from '../src/repositories/contracts/repositorio-agendamentos';
test('HTTP cliente protege escrita, não expõe reservas alheias e distingue replay sem duplicar',async()=>{
  const token=new TokenSessao().gerar().token, userId=randomUUID(), roomId=randomUUID(),unitId=randomUUID();
  let logged=true,role:'client'|'secretaria'='client',broken=false,calls=0;
  const access=new AcessoAdministrativo({async consultar(){return logged?{user:{id:userId,name:'Cliente',email:'cliente@example.invalid',role,active:true,profession:'',phone:'',createdAt:'2026-10-21T12:00:00Z',hasHoursPlan:false,hoursBalance:0},idleExpiresAt:'',absoluteExpiresAt:''}:null;}});
  const saved=new Set<string>();
  const repo:RepositorioAgendamentos={
    async listarMeus(){throw new Error('Não utilizado');}, async cancelarMeu(){throw new Error('Não utilizado');},
    async consultarDia(){calls++;if(broken)throw new Error('SQL-PRIVADO');return {precoDecimal:'50.00',ocupados:[]};},
    async criarPendente(actor,p){calls++;const criada=!saved.has(p.requestId);saved.add(p.requestId);return {criada,reserva:{id:p.requestId,userId:actor.id,unitId,roomId,date:p.periodo.date,timeSlot:p.periodo.timeSlot,status:'upcoming',adminStatus:'pending',paymentStatus:'pending',hoursFromPlan:0,total:50,createdAt:'2026-10-21T12:00:00Z'}};},
  };
  const app=await createApplication({async isReady(){return true;}},undefined,undefined,undefined,undefined,{service:new ServicoAgendamentos(repo,access),config:validarConfigAutenticacao({})});
  try{
    await app.listen(0,'127.0.0.1');const url=await app.getUrl();const headers={Cookie:'c2w_session='+token,Origin:'http://127.0.0.1:5173','Content-Type':'application/json','X-C2W-Request':'1'};
    const body={requestId:randomUUID(),roomId,date:'2030-10-21',timeSlot:'08:00 - 09:00'};
    const write=(payload:unknown=body,path='/agendamentos',h=headers)=>fetch(url+path,{method:'POST',headers:h,body:JSON.stringify(payload)});
    assert.equal((await fetch(url+'/salas/'+roomId+'/disponibilidade?data=2030-10-21')).status,401);assert.equal(calls,0);
    const response=await fetch(url+'/salas/'+roomId+'/disponibilidade?data=2030-10-21',{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const publicBody=await response.text();assert.equal(publicBody.includes(userId),false);assert.equal(publicBody.includes('email'),false);
    assert.equal((await write(body,'/AGENDAMENTOS/',{...headers,Origin:'https://outro.invalid'})).status,403);
    assert.equal((await write({...body,total:0})).status,400);
    assert.equal((await write()).status,201);assert.equal((await write()).status,200);assert.equal(saved.size,1);
    role='secretaria';const before=calls;assert.equal((await write()).status,403);assert.equal(calls,before);
    logged=false;assert.equal((await write()).status,401);
    logged=true;role='client';broken=true;const failed=await fetch(url+'/salas/'+roomId+'/disponibilidade?data=2030-10-21',{headers});assert.equal(failed.status,503);assert.equal((await failed.text()).includes('SQL-PRIVADO'),false);
  }finally{await app.close();}
});
