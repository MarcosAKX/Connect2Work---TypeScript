import { expect,it,vi } from 'vitest';
import { AuditoriaHttpGateway } from '../auditoria-http';
const id='12345678-1234-4234-8234-123456789012';
const item={id,action:'update',entity:'booking',entityId:id,occurredAt:'2026-10-21T12:00:00Z',actorName:'Admin',summary:'Cancelou agendamento'};
it('busca e cursor na URL, cookie e projeção sem detalhes brutos',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({items:[{...item,details:{token:'segredo'},senha_hash:'segredo'}],total:1,nextCursor:null})));
  const page=await new AuditoriaHttpGateway(fetcher).listActivities({search:'Admin & Nome'});
  expect(page.items).toEqual([item]);expect(fetcher.mock.calls[0]?.[0]).toBe('/api/admin/atividades?search=Admin+%26+Nome');expect(fetcher.mock.calls[0]?.[1]).toMatchObject({credentials:'include',cache:'no-store'});
});
it('rejeita páginas inválidas; 401 revalida e erro interno não vaza',async()=>{
  const fetcher=vi.fn<typeof fetch>(),expired=vi.fn(),api=new AuditoriaHttpGateway(fetcher,expired);
  for(const bad of [{items:[item,item],total:2,nextCursor:null},{items:[item],total:-1,nextCursor:null},{items:[{...item,occurredAt:'bad'}],total:1,nextCursor:null}]){
    fetcher.mockResolvedValue(new Response(JSON.stringify(bad)));await expect(api.listActivities({})).rejects.toThrow();
  }
  fetcher.mockResolvedValue(new Response('',{status:401}));await expect(api.listActivities({})).rejects.toThrow('Sessão encerrada');expect(expired).toHaveBeenCalledOnce();
  fetcher.mockRejectedValue(new Error('API_SECRET'));await expect(api.listActivities({})).rejects.not.toThrow('API_SECRET');
});
