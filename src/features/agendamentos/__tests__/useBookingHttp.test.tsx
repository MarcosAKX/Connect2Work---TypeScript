import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { createLocalStorageServices } from '../../../services/mock/local-storage';
import type { AppServices } from '../../../services/contracts';
import type { BookingAvailability, User } from '../../../types/domain';
import { useBooking, type BookingViewModel } from '../useBooking';
import { ConflitoAgendamento } from '../../../services/http/agendamentos-http';
let gateway:AppServices,user:User,root:Root,model:BookingViewModel;
const navigate=vi.fn();let roomId='room-1-1';
const day=(date='2030-10-21'):BookingAvailability=>({roomId,date,timeZone:'America/Sao_Paulo',serverNow:'2030-10-20T12:00:00Z',pricePerHour:50.25,slots:Array.from({length:13},(_,i)=>({start:String(8+i).padStart(2,'0')+':00',end:String(9+i).padStart(2,'0')+':00',available:true}))});
function Probe(){model=useBooking({roomId,user,navigate},gateway);return null;}
beforeEach(async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);localStorage.clear();sessionStorage.clear();gateway=createLocalStorageServices();user=await gateway.auth.login('teste@connect2work.com','123456');
  Object.defineProperty(gateway.auth,'mode',{value:'http'});roomId='room-1-1';navigate.mockReset();
  vi.spyOn(gateway.bookings,'getAll').mockRejectedValue(new Error('Não buscar terceiros'));
  vi.spyOn(gateway.auth,'getUserById').mockRejectedValue(new Error('Não consultar plano'));
  vi.spyOn(gateway.bookings,'getAvailability').mockImplementation(async(_room,date)=>day(date));
  root=createRoot(document.createElement('div'));
});
afterEach(async()=>{await act(async()=>root.unmount());vi.restoreAllMocks();vi.unstubAllGlobals();});
async function select(){await act(async()=>root.render(<Probe/>));await act(async()=>model.selectDate(new Date(2030,9,21)));await act(async()=>model.selectTimeSlot(0));}
it('consulta só disponibilidade, usa preço do servidor e solicita pendência sem checkout ou plano',async()=>{
  const create=vi.spyOn(gateway.bookings,'create').mockImplementation(async input=>({...input,id:input.requestId??'',adminStatus:'pending',paymentStatus:'pending',total:55,createdAt:'2030-10-20T12:00:00Z'}));
  await select();expect(model.duration).toBe(1);expect(model.total).toBe(50.25);expect(model.continueLabel).toBe('Continuar para Pagamento');
  await act(async()=>model.continueToPayment());
  expect(model.pendingReservation?.total).toBe(55);expect(create).toHaveBeenCalledOnce();expect(navigate).not.toHaveBeenCalled();expect(gateway.checkout.getDraft()).toBeNull();expect(gateway.bookings.getAll).not.toHaveBeenCalled();expect(gateway.auth.getUserById).not.toHaveBeenCalled();
});
it('resposta perdida preserva o mesmo requestId no retry e bloqueia clique duplo',async()=>{
  const ids:string[]=[];const create=vi.spyOn(gateway.bookings,'create').mockImplementation(async input=>{ids.push(input.requestId??'');throw new Error('Resposta incerta');});
  await select();await act(async()=>Promise.all([model.continueToPayment(),model.continueToPayment()]));expect(create).toHaveBeenCalledOnce();
  await act(async()=>model.continueToPayment());expect(ids).toHaveLength(2);expect(ids[0]).toBeTruthy();expect(ids[0]).toBe(ids[1]);
});
it('respostas antigas de disponibilidade não substituem a data nova',async()=>{
  await select();let finish:((value:BookingAvailability)=>void)|undefined;
  vi.mocked(gateway.bookings.getAvailability).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  await act(async()=>model.selectDate(new Date(2030,9,22)));expect(model.canContinue).toBe(false);expect(model.slots.every(s=>s.unavailable)).toBe(true);
  await act(async()=>model.selectDate(new Date(2030,9,23)));await act(async()=>finish?.({...day('2030-10-22'),slots:day().slots.map(s=>({...s,available:false}))}));
  await act(async()=>model.selectTimeSlot(0));expect(model.selectedDate?.getDate()).toBe(23);expect(model.canContinue).toBe(true);
});
it('conflito limpa intervalo e consulta novamente a disponibilidade',async()=>{
  vi.spyOn(gateway.bookings,'create').mockRejectedValue(new ConflitoAgendamento('Horário ocupado'));
  await select();const before=vi.mocked(gateway.bookings.getAvailability).mock.calls.length;
  await act(async()=>model.continueToPayment());expect(model.duration).toBe(0);expect(model.submitError).toContain('ocupado');expect(vi.mocked(gateway.bookings.getAvailability).mock.calls.length).toBeGreaterThan(before);
});
it('clicar novamente no mesmo dia consulta a grade sem ficar travado',async()=>{
  await select();await act(async()=>model.selectDate(new Date(2030,9,21)));
  await act(async()=>model.selectTimeSlot(0));expect(model.canContinue).toBe(true);
});
it('trocar de sala durante envio não exibe protocolo antigo nem deixa envio travado',async()=>{
  let finish:((value:Awaited<ReturnType<AppServices['bookings']['create']>>)=>void)|undefined;
  vi.spyOn(gateway.bookings,'create').mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  await select();let sending:Promise<void>|undefined;
  await act(async()=>{sending=model.continueToPayment();});
  roomId='room-1-2';await act(async()=>root.render(<Probe/>));
  await act(async()=>{finish?.({id:'old',userId:user.id,roomId:'room-1-1',unitId:'unit-1',date:'2030-10-21',timeSlot:'08:00 - 09:00',status:'upcoming',createdAt:'2030-10-20T12:00:00Z'});await sending;});
  expect(model.pendingReservation).toBeNull();expect(model.isSaving).toBe(false);
});
it.each(['sucesso','erro'])('voltar à sala original não aceita %s da visita anterior',async outcome=>{
  let finish:(()=>void)|undefined;
  vi.spyOn(gateway.bookings,'create').mockImplementation(()=>new Promise((resolve,reject)=>{finish=()=>outcome==='erro'?reject(new Error('Erro antigo')):resolve({id:'antigo',userId:user.id,unitId:'unit-1',roomId:'room-1-1',date:'2030-10-21',timeSlot:'08:00 - 09:00',status:'upcoming',createdAt:'2030-10-20T12:00:00Z'});}));
  await select();let sending:Promise<void>|undefined;await act(async()=>{sending=model.continueToPayment();});
  roomId='room-1-2';await act(async()=>root.render(<Probe/>));roomId='room-1-1';await act(async()=>root.render(<Probe/>));
  await act(async()=>{finish?.();await sending;});
  expect(model.pendingReservation).toBeNull();expect(model.submitError).toBe('');
});
