import { BadRequestException } from '@nestjs/common';
import type { ConsultaAuditoria, RepositorioAuditoria } from '../repositories/contracts/repositorio-auditoria';
import type { AcessoAdministrativo } from '../security/acesso-administrativo';
import { LimiteAdministrativo } from '../security/limite-administrativo';
import { objeto, texto, uuid } from './validacao-usuario-administrativo';
export function consultaAuditoria(input:unknown):ConsultaAuditoria {
  const q=objeto(input,['search','cursor']);
  let cursor:ConsultaAuditoria['cursor']=null;
  if(q.cursor!==undefined){
    try {
      const encoded=texto(q.cursor,200);if(!/^[\w-]+$/.test(encoded))throw new Error();
      const point=objeto(JSON.parse(Buffer.from(encoded,'base64url').toString('utf8')),['at','id']);
      const at=texto(point.at,26);
      if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(at))throw new Error();
      const ms=at.slice(0,23).replace(' ','T')+'Z';
      if(!Number.isFinite(Date.parse(ms))||new Date(ms).toISOString()!==ms)throw new Error();
      cursor={at,id:uuid(texto(point.id,36))};
    }catch {throw new BadRequestException('Página inválida. Atualize a lista.');}
  }
  return {search:q.search===undefined?'':texto(q.search,150),cursor};
}
export class ServicoAuditoria {
  private readonly limit=new LimiteAdministrativo();
  constructor(private readonly repo:RepositorioAuditoria,private readonly access:Pick<AcessoAdministrativo,'exigir'>){}
  async listar(token:string|null,query:unknown){
    const actor=await this.access.exigir(token,['admin']);this.limit.verificar(actor.id,false);
    return this.repo.listar(consultaAuditoria(query));
  }
}
