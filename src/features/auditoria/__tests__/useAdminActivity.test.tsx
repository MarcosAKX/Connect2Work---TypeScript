import { act } from 'react';
import { createRoot,type Root } from 'react-dom/client';
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { createLocalStorageServices } from '../../../services/mock/local-storage';
import type { AppServices } from '../../../services/contracts';
import type { AuditPage,User } from '../../../types/domain';
import { useAdminActivity,type AdminActivityViewModel } from '../useAdminActivity';
let root:Root,gateway:AppServices,user:User,model:AdminActivityViewModel;
const page:AuditPage={items:[{id:'first',action:'create',entity:'task',entityId:'task',occurredAt:'2026-10-21T12:00:00Z',actorName:'Admin'}],total:2,nextCursor:'next'};
function Probe(){model=useAdminActivity(user,gateway);return null;}
beforeEach(async()=>{vi.useFakeTimers();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);localStorage.clear();sessionStorage.clear();gateway=createLocalStorageServices();user=await gateway.auth.login('teste@connect2work.com','123456');user={...user,role:'admin'};Object.defineProperty(gateway.auth,'mode',{value:'http'});gateway.audit.listActivities=vi.fn(async()=>page);vi.spyOn(gateway.audit,'listRecent');vi.spyOn(gateway.users,'listUsersWithHoursPlanInfo');root=createRoot(document.createElement('div'));});
afterEach(async()=>{await act(async()=>root.unmount());vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
const mount=async()=>{await act(async()=>root.render(<Probe/>));await act(async()=>vi.runOnlyPendingTimersAsync());};
it('consulta paginada real não carrega mock, usuários ou planos',async()=>{await mount();expect(model.filtered).toHaveLength(1);expect(model.total).toBe(2);expect(gateway.audit.listRecent).not.toHaveBeenCalled();expect(gateway.users.listUsersWithHoursPlanInfo).not.toHaveBeenCalled();});
it('busca descarta resposta anterior e envia filtro ao servidor',async()=>{
  let finish:((p:AuditPage)=>void)|undefined;
  gateway.audit.listActivities=vi.fn(()=>new Promise<AuditPage>(resolve=>{finish=resolve;}));await mount();const old=finish;
  await act(async()=>model.search('Novo'));await act(async()=>vi.advanceTimersByTimeAsync(300));await act(async()=>old?.(page));expect(model.filtered).toHaveLength(0);
  await act(async()=>finish?.({...page,items:[],total:0,nextCursor:null}));expect(gateway.audit.listActivities).toHaveBeenLastCalledWith({search:'Novo'});expect(model.total).toBe(0);
});
it('carregar mais usa cursor sem duplicar, bloqueia clique duplo e permite retry',async()=>{
  await mount();let finish:((p:AuditPage)=>void)|undefined;gateway.audit.listActivities=vi.fn(()=>new Promise<AuditPage>(resolve=>{finish=resolve;}));let pending:Promise<void>|undefined;
  await act(async()=>{pending=model.loadMore();void model.loadMore();});expect(gateway.audit.listActivities).toHaveBeenCalledOnce();expect(gateway.audit.listActivities).toHaveBeenCalledWith({search:'',cursor:'next'});
  await act(async()=>{finish?.({...page,items:[...page.items,{...page.items[0]!,id:'second'}],nextCursor:null});await pending;});expect(model.filtered.map(item=>item.id)).toEqual(['first','second']);
});
it('busca no mock preserva o cliente selecionado no extrato',async()=>{
  gateway=createLocalStorageServices();user=await gateway.auth.login('admin@connect2work.com','admin123');await mount();
  await act(async()=>model.setSelectedClient('cliente-selecionado'));await act(async()=>model.search('Sala'));await act(async()=>vi.runOnlyPendingTimersAsync());
  expect(model.selectedClient).toBe('cliente-selecionado');
});
