import assert from 'node:assert/strict';
import { randomBytes,randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApplication } from '../src/application';
import { validarConfigAutenticacao } from '../src/config/auth-environment';
import { AcessoAdministrativo } from '../src/security/acesso-administrativo';
import { ServicoAgendamentosAdministrativos } from '../src/services/servico-agendamentos-administrativos';
import type { RepositorioAgendamentosAdministrativos } from '../src/repositories/contracts/repositorio-agendamentos-administrativos';
import type { LinhaAgendamento,PaginaAgendamentos } from '../src/dto/agendamento-administrativo.dto';
test('HTTP admin agendamentos nega antes da leitura, protege escrita, valida campos e sanitiza falhas', async()=>{
 const admin=randomBytes(32).toString('base64url'),secretary=randomBytes(32).toString('base64url'),client=randomBytes(32).toString('base64url');let calls=0,broken=false;
 const userId=randomUUID(),roomId=randomUUID();const item:LinhaAgendamento={booking:{id:randomUUID(),userId,unitId:randomUUID(),roomId,date:'2030-10-20',timeSlot:'08:00 - 09:00',status:'upcoming',adminStatus:'confirmed',paymentStatus:'pending',hoursFromPlan:0,createdAt:'2026-10-19T12:00:00Z',version:'2026-10-19 12:00:00.000001'},clientName:'Teste',roomName:'Sala',unitName:'Unidade',adminStatus:'confirmed'};
 const page:PaginaAgendamentos={items:[item],total:1,page:1,pageSize:20,summary:{total:1,confirmed:1,pending:0,cancelled:0,today:0,checkInsToday:0},today:'2026-10-19',serverNow:'2026-10-19T12:00:00Z'};
 const repo:RepositorioAgendamentosAdministrativos={async listar(){calls++;if(broken)throw new Error('SQL-SEGREDO');return page;},async painel(){calls++;return {agenda:page,counts:{present:0,payments:0,waiting:0,today:0,checkIns:0},firstPayment:null,firstWaiting:null,nextArrival:null,upcomingDays:[]};},async criar(){calls++;return {item,criada:true};},async alterar(){calls++;return item;}};
 const access=new AcessoAdministrativo({async consultar(token){if(![admin,secretary,client].includes(token??''))return null;return {user:{id:userId,name:'Teste',email:'teste@example.invalid',profession:'',phone:'',role:token===client?'client':token===secretary?'secretaria':'admin',active:true,createdAt:'2026-10-19',hasHoursPlan:false,hoursBalance:0},idleExpiresAt:'2030-10-20T12:00:00Z',absoluteExpiresAt:'2030-10-20T12:00:00Z'};}});
 const app=await createApplication({async isReady(){return true;}},undefined,undefined,undefined,{service:new ServicoAgendamentosAdministrativos(repo,access),config:validarConfigAutenticacao({})});
 try {
  await app.listen(0,'127.0.0.1');const base=await app.getUrl();const auth=(token: string)=>({Cookie:'c2w_session='+token});const writes={...auth(admin),Origin:'http://127.0.0.1:5173','Content-Type':'application/json','X-C2W-Request':'1'};
  assert.equal((await fetch(base+'/admin/agendamentos')).status,401);assert.equal((await fetch(base+'/admin/agendamentos',{headers:auth(client)})).status,403);assert.equal(calls,0);
  assert.equal((await fetch(base+'/admin/agendamentos',{headers:auth(admin)})).status,200);assert.equal((await fetch(base+'/admin/painel-do-dia',{headers:auth(secretary)})).status,200);
  const before=calls;assert.equal((await fetch(base+'/admin/agendamentos?pageSize=1000',{headers:auth(admin)})).status,400);assert.equal(calls,before);
  const body={requestId:randomUUID(),clientId:userId,roomId,date:'2030-10-20',timeSlot:'08:00 - 09:00',total:'50.00',paymentStatus:'pending'};
  assert.equal((await fetch(base+'/admin/agendamentos',{method:'POST',headers:auth(admin),body:JSON.stringify(body)})).status,403);
  assert.equal((await fetch(base+'/admin/agendamentos',{method:'POST',headers:writes,body:JSON.stringify({...body,actor:userId})})).status,400);
  assert.equal((await fetch(base+'/admin/agendamentos',{method:'POST',headers:writes,body:JSON.stringify(body)})).status,201);
  assert.equal((await fetch(base+'/admin/agendamentos/'+item.booking.id+'/chegada',{method:'PATCH',headers:writes,body:JSON.stringify({expectedVersion:item.booking.version,checkedInBy:userId})})).status,400);
  assert.equal((await fetch(base+'/admin/agendamentos/'+item.booking.id+'/pagamento',{method:'PATCH',headers:writes,body:JSON.stringify({expectedVersion:item.booking.version})})).status,200);
  broken=true;const failed=await fetch(base+'/admin/agendamentos',{headers:auth(admin)});assert.equal(failed.status,503);assert.equal((await failed.text()).includes('SQL-SEGREDO'),false);
 }finally{await app.close();}
});
