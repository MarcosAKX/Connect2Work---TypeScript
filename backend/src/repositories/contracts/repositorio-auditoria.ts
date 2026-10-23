export interface ConsultaAuditoria { search:string; cursor:{at:string;id:string}|null; }
export interface RegistroAuditoriaDto { id:string; actorUserId?:string; actorName?:string; action:string; entity:string; entityId:string; occurredAt:string; summary?:string; }
export interface PaginaAuditoria { items:RegistroAuditoriaDto[]; total:number; nextCursor:string|null; }
export interface RepositorioAuditoria { listar(query:ConsultaAuditoria):Promise<PaginaAuditoria>; }
