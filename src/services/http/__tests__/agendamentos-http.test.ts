import { expect, it, vi } from 'vitest';
import { AgendamentosHttpGateway, ConflitoAgendamento } from '../agendamentos-http';
const id='12345678-1234-4234-8234-123456789012',room='22345678-1234-4234-8234-123456789012';
const input={requestId:id,userId:id,unitId:id,roomId:room,date:'2030-10-21',timeSlot:'08:00 - 09:00',status:'upcoming' as const,total:0};
const booking={...input,id,adminStatus:'pending',paymentStatus:'pending',total:50.25,hoursFromPlan:0,createdAt:'2026-10-21T12:00:00.000Z'};
it('envia apenas quatro campos; preserva situação real no replay e rejeita outro pedido',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({...booking,status:'cancelled',adminStatus:'cancelled'})));
  const api=new AgendamentosHttpGateway(fetcher);
  expect((await api.create(input)).status).toBe('cancelled');
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({requestId:id,roomId:room,date:'2030-10-21',timeSlot:'08:00 - 09:00'});
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({credentials:'include',cache:'no-store'});
  fetcher.mockResolvedValue(new Response(JSON.stringify({...booking,roomId:id})));
  await expect(api.create(input)).rejects.toThrow();
});
it('conflito exige atualizar disponibilidade; 401 revalida e falha interna não vaza',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({code:'HORARIO_OCUPADO'}),{status:409}));
  const expired=vi.fn();const api=new AgendamentosHttpGateway(fetcher,expired);
  await expect(api.create(input)).rejects.toBeInstanceOf(ConflitoAgendamento);
  fetcher.mockResolvedValue(new Response('',{status:401}));await expect(api.create(input)).rejects.toThrow('Sessão encerrada');expect(expired).toHaveBeenCalledOnce();
  fetcher.mockResolvedValue(new Response('SQL-PRIVADO',{status:503}));await expect(api.create(input)).rejects.not.toThrow('SQL-PRIVADO');
});
it('grade de disponibilidade deve corresponder à sala, data e 13 faixas ordenadas',async()=>{
  const day={roomId:room,date:'2030-10-21',timeZone:'America/Sao_Paulo',serverNow:'2030-10-20T12:00:00.000Z',pricePerHour:50.25,slots:Array.from({length:13},(_,i)=>({start:String(8+i).padStart(2,'0')+':00',end:String(9+i).padStart(2,'0')+':00',available:true}))};
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(day)));const api=new AgendamentosHttpGateway(fetcher);
  expect((await api.getAvailability(room,day.date)).slots).toHaveLength(13);
  expect(fetcher.mock.calls[0]?.[0]).toBe('/api/salas/'+room+'/disponibilidade?data=2030-10-21');
  for(const bad of [{...day,roomId:id},{...day,date:'2030-10-22'},{...day,slots:day.slots.slice(1)},{...day,slots:[day.slots[1],...day.slots.slice(1)]}]){
    fetcher.mockResolvedValue(new Response(JSON.stringify(bad)));await expect(api.getAvailability(room,day.date)).rejects.toThrow();
  }
});
it('lista própria não envia proprietário e cancelamento envia somente versão',async()=>{
  const own={booking:{...booking,version:'2026-10-21 12:00:00.000001',clientCanCancel:true},roomName:'Sala',unitName:'Unidade'};
  const page={items:[own],counts:{upcoming:1,past:0,cancelled:0},nextCursor:null,serverNow:'2026-10-21T12:00:00Z'};
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(page)));const api=new AgendamentosHttpGateway(fetcher);
  expect((await api.listOwn('upcoming')).items[0]?.roomName).toBe('Sala');expect(fetcher.mock.calls[0]?.[0]).toBe('/api/agendamentos/meus?status=upcoming');
  fetcher.mockResolvedValue(new Response(JSON.stringify({...own,booking:{...own.booking,status:'cancelled',adminStatus:'cancelled',clientCanCancel:false}})));
  expect((await api.cancel(id,id,own.booking.version)).status).toBe('cancelled');
  expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({expectedVersion:own.booking.version});
});
