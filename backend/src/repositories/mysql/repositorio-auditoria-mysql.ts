import type { OnModuleDestroy } from '@nestjs/common';
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import type { DatabaseConfig } from '../../config/environment';
import { buildPoolOptions } from '../../database/database.service';
import { bancoAdministrativo } from './banco-administrativo';
import type { ConsultaAuditoria, RegistroAuditoriaDto, RepositorioAuditoria } from '../contracts/repositorio-auditoria';
interface Row extends RowDataPacket {id:string;usuario_id:string|null;nome_usuario:string|null;acao:string;entidade:string;entidade_id:string;ocorrido_em:Date;cursor_at:string;operation:string|null;manual_refund:string|null;}
const entities:Record<string,string>={user:'usuário',unit:'unidade',room:'sala',business_service:'serviço',booking:'agendamento',task:'tarefa',hours_plan:'plano de horas',backup:'backup'};
function dto(row:Row):RegistroAuditoriaDto {
  let summary:string|undefined;
  if(row.entidade==='booking'&&row.acao==='update'){
    if(row.operation==='cancelamento')summary='Cancelou agendamento'+(row.manual_refund==='true'?' · reembolso manual pela equipe':'');
    if(row.operation==='pagamento')summary='Registrou pagamento de agendamento';
    if(row.operation==='confirmacao')summary='Confirmou agendamento';
    if(row.operation==='chegada')summary='Fez check-in de agendamento';
  }
  return {id:row.id,action:row.acao,entity:row.entidade,entityId:row.entidade_id,occurredAt:row.ocorrido_em.toISOString(),...(row.usuario_id?{actorUserId:row.usuario_id}:{}),...(row.nome_usuario?{actorName:row.nome_usuario}:{}),...(summary?{summary}:{})};
}
export class RepositorioAuditoriaMysql implements RepositorioAuditoria,OnModuleDestroy {
  private readonly pool:Pool;
  constructor(config:DatabaseConfig){this.pool=createPool(buildPoolOptions(config));}
  async onModuleDestroy(){await this.pool.end();}
  async listar(query:ConsultaAuditoria){
    return bancoAdministrativo(this.pool,async c=>{
      await c.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await c.beginTransaction();
      try{
        const values:string[]=[];let where='1=1';
        if(query.search){
          const pattern='%'+query.search.replace(/[!%_]/g,'!$&')+'%';
          const matches=Object.entries(entities).filter(([,label])=>label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(query.search.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())).map(([key])=>key);
          where="(nome_usuario LIKE ? ESCAPE '!' OR entidade_id LIKE ? ESCAPE '!' OR entidade LIKE ? ESCAPE '!'";
          values.push(pattern,pattern,pattern);
          if(matches.length){where+=' OR entidade IN ('+matches.map(()=>'?').join(',')+')';values.push(...matches);}
          where+=')';
        }
        const [counts]=await c.execute<RowDataPacket[]>({sql:'SELECT COUNT(*) total FROM registros_auditoria WHERE '+where,timeout:2000},values);
        const seek=query.cursor?' AND (ocorrido_em<? OR (ocorrido_em=? AND id<?))':'';
        const params=[...values,...(query.cursor?[query.cursor.at,query.cursor.at,query.cursor.id]:[])];
        // Explicit projection: raw JSON, credentials, contacts and fingerprints never leave this query.
        const [rows]=await c.execute<Row[]>({sql:"SELECT id,usuario_id,nome_usuario,acao,entidade,entidade_id,ocorrido_em,DATE_FORMAT(ocorrido_em,'%Y-%m-%d %H:%i:%s.%f') cursor_at,JSON_UNQUOTE(JSON_EXTRACT(detalhes,'$.action')) operation,JSON_UNQUOTE(JSON_EXTRACT(detalhes,'$.manualRefund')) manual_refund FROM registros_auditoria WHERE "+where+seek+' ORDER BY ocorrido_em DESC,id DESC LIMIT 31',timeout:2000},params);
        const items=rows.slice(0,30),last=items[items.length-1];
        await c.commit();
        return {items:items.map(dto),total:Number(counts[0]?.total??0),nextCursor:rows.length>30&&last?Buffer.from(JSON.stringify({at:last.cursor_at,id:last.id})).toString('base64url'):null};
      }catch(error:unknown){await c.rollback();throw error;}
    });
  }
}
