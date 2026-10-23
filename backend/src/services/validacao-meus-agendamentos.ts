import { BadRequestException } from '@nestjs/common';
import { objeto, texto, uuid } from './validacao-usuario-administrativo';
import type { ConsultaMeusAgendamentos, CursorCliente } from '../dto/agendamento.dto';
export function cursorMeusAgendamentos(point:CursorCliente):string { return Buffer.from(JSON.stringify(point)).toString('base64url'); }
export function consultaMeusAgendamentos(input:unknown):ConsultaMeusAgendamentos {
  const q=objeto(input,['status','cursor']);const status=q.status??'upcoming';
  if(status!=='upcoming'&&status!=='past'&&status!=='cancelled')throw new BadRequestException('Categoria inválida.');
  let cursor:CursorCliente|null=null;
  if(q.cursor!==undefined){
    try {
      const encoded=texto(q.cursor,180);if(!/^[\w-]+$/.test(encoded))throw new Error();
      const point=objeto(JSON.parse(Buffer.from(encoded,'base64url').toString('utf8')),['at','id']);
      const at=texto(point.at,24);if(!Number.isFinite(Date.parse(at))||new Date(at).toISOString()!==at)throw new Error();
      cursor={at,id:uuid(texto(point.id,36))};
    }catch{throw new BadRequestException('Página inválida. Atualize os agendamentos.');}
  }
  return {status,cursor};
}
