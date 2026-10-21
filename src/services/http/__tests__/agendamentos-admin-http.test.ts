import { describe,it,expect,vi } from 'vitest';
import { AgendamentosAdminHttpGateway } from '../agendamentos-admin-http';
const id='12cb4430-5bf9-4ad6-9dc8-e6150982e98d';
const row={booking:{id,userId:id,unitId:id,roomId:id,date:'2030-10-20',timeSlot:'08:00 - 09:00',status:'upcoming',adminStatus:'confirmed',paymentStatus:'pending',hoursFromPlan:0,createdAt:'2026-10-19T12:00:00Z',version:'2026-10-19 12:00:00.000001'},clientName:'Cliente',roomName:'Sala',unitName:'Unidade',adminStatus:'confirmed'};
describe('gateway admin agendamentos',()=>{
 it('envia corpo mínimo, cookie e versão, sem operador forjado ou valor inventado na resposta',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockImplementation(async()=>new Response(JSON.stringify({...row,senha:'segredo'}),{status:201}));const g=new AgendamentosAdminHttpGateway(fetcher);
  const result=await g.create({requestId:id,clientId:id,roomId:id,date:'2030-10-20',timeSlot:'08:00 - 09:00',total:'50.00',paymentStatus:'pending'});
  expect(result.total).toBeUndefined();expect(JSON.stringify(result)).not.toContain('segredo');expect(fetcher.mock.calls[0]?.[1]?.credentials).toBe('include');
  await g.action(id,'pagamento',row.booking.version);expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({expectedVersion:row.booking.version});
 });
 it('revalida 401 e sanitiza falha de infraestrutura',async()=>{const expired=vi.fn();const f=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('{}',{status:401})).mockResolvedValueOnce(new Response('SQL segredo',{status:503}));const g=new AgendamentosAdminHttpGateway(f,expired);await expect(g.searchClients('x')).rejects.toThrow();expect(expired).toHaveBeenCalledOnce();await expect(g.searchClients('x')).rejects.not.toThrow('segredo');});
 it('recusa datas e versões inválidas em respostas',async()=>{const f=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({...row,booking:{...row.booking,version:'bad'}}),{status:200}));await expect(new AgendamentosAdminHttpGateway(f).action(id,'pagamento',row.booking.version)).rejects.toThrow();});
});

it('fetch padrão não é invocado com o gateway como receptor',async()=>{const original=globalThis.fetch;globalThis.fetch=function(this:unknown){expect(this===undefined||this===globalThis).toBe(true);return Promise.resolve(new Response('[]',{status:200}));};try{await expect(new AgendamentosAdminHttpGateway().searchClients('')).resolves.toEqual([]);}finally{globalThis.fetch=original;}});
