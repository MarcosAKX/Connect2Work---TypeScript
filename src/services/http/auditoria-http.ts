import type { AuditGateway } from '../contracts';
import type { AuditLog, AuditPage, AuditQuery } from '../../types/domain';
const failure='Não foi possível consultar as atividades. Tente novamente.';
class ErroAuditoria extends Error{}
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new ErroAuditoria(failure);return Object.fromEntries(Object.entries(v));}
function text(v:unknown,max:number):string{if(typeof v!=='string'||v.length>max)throw new ErroAuditoria(failure);return v;}
function id(v:unknown):string{const s=text(v,36);if(!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(s))throw new ErroAuditoria(failure);return s;}
function log(value:unknown):AuditLog{
  const row=object(value),at=text(row.occurredAt,40);
  if(!at.endsWith('Z')||!Number.isFinite(Date.parse(at)))throw new ErroAuditoria(failure);
  return {id:id(row.id),action:text(row.action,30),entity:text(row.entity,50),entityId:id(row.entityId),occurredAt:at,
    ...(row.actorUserId===undefined?{}:{actorUserId:id(row.actorUserId)}),...(row.actorName===undefined?{}:{actorName:text(row.actorName,150)}),...(row.summary===undefined?{}:{summary:text(row.summary,200)})};
}
export class AuditoriaHttpGateway implements AuditGateway{
  constructor(private readonly fetcher:typeof fetch=(input,init)=>fetch(input,init),private readonly expired:()=>void|Promise<unknown>=()=>{}){}
  async listActivities(query:AuditQuery):Promise<AuditPage>{
    const q=new URLSearchParams();if(query.search)q.set('search',query.search);if(query.cursor)q.set('cursor',query.cursor);
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);
    try{
      const response=await this.fetcher('/api/admin/atividades'+(q.size?'?'+q:''),{credentials:'include',cache:'no-store',signal:abort.signal});
      if(response.status===401){await this.expired();throw new ErroAuditoria('Sessão encerrada. Faça login novamente.');}
      if(response.status===403)throw new ErroAuditoria('Acesso permitido somente ao administrador.');
      if(response.status===400)throw new ErroAuditoria('Busca ou página inválida. Atualize a lista.');
      if(response.status===429)throw new ErroAuditoria('Muitas solicitações. Aguarde um minuto.');
      if(!response.ok)throw new ErroAuditoria(failure);
      const page=object(await response.json());
      if(!Array.isArray(page.items)||page.items.length>30||typeof page.total!=='number'||!Number.isSafeInteger(page.total)||page.total<page.items.length)throw new ErroAuditoria(failure);
      const items=page.items.map(log),cursor=page.nextCursor===null?null:text(page.nextCursor,200);
      if(new Set(items.map(item=>item.id)).size!==items.length||cursor!==null&&(!/^[\w-]+$/.test(cursor)||items.length!==30))throw new ErroAuditoria(failure);
      return {items,total:page.total,nextCursor:cursor};
    }catch(error:unknown){if(error instanceof ErroAuditoria)throw error;throw new ErroAuditoria(failure);}
    finally{clearTimeout(timer);}
  }
  async listRecent():Promise<AuditLog[]>{throw new ErroAuditoria('Use a consulta paginada de atividades.');}
  async listHoursPlanTransactions():Promise<never>{throw new ErroAuditoria('Extrato de horas ainda não integrado à API.');}
}
