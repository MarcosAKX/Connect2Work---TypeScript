import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createLocalStorageServices } from '../../../services/mock/local-storage';
import type { AppServices } from '../../../services/contracts';
import type { Booking, OwnBookingsPage, User } from '../../../types/domain';
import { useBookings, type BookingsViewModel } from '../useBookings';
let gateway:AppServices,user:User,root:Root,model:BookingsViewModel;
const booking:Booking={id:'reservation',userId:'',roomId:'room',unitId:'unit',date:'2030-10-21',timeSlot:'08:00 - 09:00',status:'upcoming',paymentStatus:'completed',version:'version',createdAt:'2026-10-21T12:00:00Z',clientCanCancel:true};
const page=():OwnBookingsPage=>({items:[{booking:{...booking,userId:user.id},roomName:'Sala própria',unitName:'Unidade própria'}],counts:{upcoming:1,past:0,cancelled:0},nextCursor:null,serverNow:'2026-10-21T12:00:00Z'});
function Probe(){model=useBookings(user,gateway);return null;}
beforeEach(async()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);localStorage.clear();sessionStorage.clear();gateway=createLocalStorageServices();user=await gateway.auth.login('teste@connect2work.com','123456');Object.defineProperty(gateway.auth,'mode',{value:'http'});gateway.bookings.listOwn=vi.fn(async()=>page());vi.spyOn(gateway.catalog,'getUnits');vi.spyOn(gateway.bookings,'getAll');root=createRoot(document.createElement('div'));});
afterEach(async()=>{await act(async()=>root.unmount());vi.restoreAllMocks();vi.unstubAllGlobals();});
it('consulta somente a lista própria e usa nomes do DTO',async()=>{await act(async()=>root.render(<Probe/>));expect(model.rooms.room?.name).toBe('Sala própria');expect(gateway.catalog.getUnits).not.toHaveBeenCalled();expect(gateway.bookings.getAll).not.toHaveBeenCalled();});
it('descarta resposta da aba anterior e não aceita proprietário diferente',async()=>{
  let finish:((v:OwnBookingsPage)=>void)|undefined;
  gateway.bookings.listOwn=vi.fn(()=>new Promise<OwnBookingsPage>(resolve=>{finish=resolve;}));await act(async()=>root.render(<Probe/>));const old=finish;
  await act(async()=>model.setStatus('cancelled'));await act(async()=>old?.(page()));expect(model.bookings).toHaveLength(0);
  await act(async()=>finish?.({...page(),items:[{...page().items[0]!,booking:{...booking,userId:'outro',status:'cancelled'}}]}));expect(model.bookings).toHaveLength(0);expect(model.feedback?.type).toBe('error');
});
it('cancelamento bloqueia clique duplo, envia versão e avisa reembolso manual',async()=>{
  await act(async()=>root.render(<Probe/>));let finish:((b:Booking)=>void)|undefined;const cancel=vi.spyOn(gateway.bookings,'cancel').mockImplementation(()=>new Promise<Booking>(resolve=>{finish=resolve;}));let pending:Promise<void>|undefined;
  await act(async()=>{pending=model.cancelBooking({...booking,userId:user.id});void model.cancelBooking({...booking,userId:user.id});});expect(cancel).toHaveBeenCalledExactlyOnceWith('reservation',user.id,'version');
  await act(async()=>{finish?.({...booking,userId:user.id,status:'cancelled'});await pending;});expect(model.feedback?.message).toContain('manualmente');
});
it('pagina sem duplicar reservas e não mistura uma aba nova',async()=>{
  gateway.bookings.listOwn=vi.fn(async(_status,cursor)=>cursor?{...page(),items:[...page().items,{...page().items[0]!,booking:{...booking,userId:user.id,id:'second'}}]}:{...page(),nextCursor:'next'});
  await act(async()=>root.render(<Probe/>));await act(async()=>model.loadMore());expect(model.bookings.map(b=>b.id)).toEqual(['reservation','second']);
});


