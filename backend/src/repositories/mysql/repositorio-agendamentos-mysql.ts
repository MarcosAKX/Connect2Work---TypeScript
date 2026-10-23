import { ConflictException, NotFoundException, type OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import type { DatabaseConfig } from '../../config/environment';
import { buildPoolOptions } from '../../database/database.service';
import { bancoAdministrativo } from './banco-administrativo';
import { bloquearAcessoAdministrativo } from '../../security/transacao-administrativa';
import type { AtorAdministrativo } from '../../security/acesso-administrativo';
import { RelogioSistema, type Relogio } from '../../security/relogio';
import { dataComercial } from '../../domain/horario-comercial';
import type { PedidoAgendamento, RepositorioAgendamentos } from '../contracts/repositorio-agendamentos';
import type { ReservaPublicaDto, ConsultaMeusAgendamentos, ItemReservaCliente } from '../../dto/agendamento.dto';
import { cursorMeusAgendamentos } from '../../services/validacao-meus-agendamentos';
interface Row extends RowDataPacket { id: string; usuario_id: string; sala_id: string; unidade_id: string; sala_nome:string; unidade_nome:string; versao:string; inicio_em: Date; fim_em: Date; situacao: string; situacao_pagamento: string; valor_acordado: string; horas_do_plano: string; criado_em: Date; }
const select = "SELECT b.*,s.unidade_id,s.nome sala_nome,n.nome unidade_nome,DATE_FORMAT(b.atualizado_em,'%Y-%m-%d %H:%i:%s.%f') versao FROM agendamentos b JOIN salas s ON s.id=b.sala_id JOIN unidades n ON n.id=s.unidade_id WHERE b.id=?";
function cancelRestriction(row:Row,now:Date):string {
  if(row.situacao==='cancelado')return 'Agendamento já cancelado.';
  if(Number(row.horas_do_plano)>0)return 'Cancelamento com horas do plano: entre em contato com a equipe.';
  if(row.inicio_em.getTime()-now.getTime()<86400000)return 'Cancelamento indisponível: faltam menos de 24 horas.';
  return '';
}
function ownItem(row:Row,now:Date):ItemReservaCliente {
  const reason=cancelRestriction(row,now);
  return {booking:{...dto(row,now),version:row.versao,status:row.situacao==='cancelado'?'cancelled':row.inicio_em<=now?'past':'upcoming',clientCanCancel:!reason,...(reason?{clientCancelReason:reason}:{})},roomName:row.sala_nome,unitName:row.unidade_nome};
}
function incompatible(): never { throw new ConflictException({ code: 'PEDIDO_INCOMPATIVEL', message: 'Pedido incompatível. Confira sua solicitação.' }); }
function dto(row: Row, now: Date): ReservaPublicaDto {
  const hour = (date: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(date);
  return { id: row.id, userId: row.usuario_id, unitId: row.unidade_id, roomId: row.sala_id, date: dataComercial(row.inicio_em), timeSlot: `${hour(row.inicio_em)} - ${hour(row.fim_em)}`, status: row.situacao==='cancelado' ? 'cancelled' : row.fim_em<=now ? 'past' : 'upcoming', adminStatus: row.situacao==='cancelado' ? 'cancelled' : row.situacao==='confirmado' ? 'confirmed' : 'pending', paymentStatus: row.situacao_pagamento==='concluido' ? 'completed' : 'pending', total:Number(row.valor_acordado), hoursFromPlan:Number(row.horas_do_plano), createdAt:row.criado_em.toISOString() };
}
export class RepositorioAgendamentosMysql implements RepositorioAgendamentos, OnModuleDestroy {
  private readonly pool: Pool;
  constructor(config: DatabaseConfig, private readonly clock: Relogio = new RelogioSistema(), private readonly auditId: ()=>string = randomUUID) { this.pool = createPool(buildPoolOptions(config)); }
  async onModuleDestroy() { await this.pool.end(); }
  async listarMeus(actor:AtorAdministrativo,q:ConsultaMeusAgendamentos) {
    return bancoAdministrativo(this.pool,async c=>{
      await c.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await c.beginTransaction();
      try {
        const now=this.clock.agora();
        const [summary]=await c.execute<RowDataPacket[]>({sql:"SELECT SUM(situacao<>'cancelado' AND inicio_em>?) upcoming,SUM(situacao<>'cancelado' AND inicio_em<=?) past,SUM(situacao='cancelado') cancelled FROM agendamentos WHERE usuario_id=?",timeout:2000},[now,now,actor.id]);
        const condition=q.status==='cancelled'?"b.situacao='cancelado'":q.status==='past'?"b.situacao<>'cancelado' AND b.inicio_em<=?":"b.situacao<>'cancelado' AND b.inicio_em>?";
        const values:Array<string|Date>=[actor.id,...(q.status==='cancelled'?[]:[now])];
        const operator=q.status==='upcoming'?'>':'<',order=q.status==='upcoming'?'ASC':'DESC';
        const seek=q.cursor?` AND (b.inicio_em${operator}? OR (b.inicio_em=? AND b.id${operator}?))`:'';
        if(q.cursor)values.push(new Date(q.cursor.at),new Date(q.cursor.at),q.cursor.id);
        const [rows]=await c.execute<Row[]>({sql:select.replace('WHERE b.id=?','WHERE b.usuario_id=?')+' AND '+condition+seek+` ORDER BY b.inicio_em ${order},b.id ${order} LIMIT 21`,timeout:2000},values);
        const items=rows.slice(0,20),last=items[items.length-1],s=summary[0];
        await c.commit();
        return {items:items.map(row=>ownItem(row,now)),counts:{upcoming:Number(s?.upcoming??0),past:Number(s?.past??0),cancelled:Number(s?.cancelled??0)},nextCursor:rows.length>20&&last?cursorMeusAgendamentos({at:last.inicio_em.toISOString(),id:last.id}):null,serverNow:now.toISOString()};
      }catch(error:unknown){await c.rollback();throw error;}
    });
  }
  async cancelarMeu(actor:AtorAdministrativo,id:string,version:string) {
    return bancoAdministrativo(this.pool,async c=>{
      await c.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();
      try {
        await bloquearAcessoAdministrativo(c,actor,this.clock,[],['client']);
        const [rows]=await c.execute<Row[]>({sql:select+' AND b.usuario_id=? FOR UPDATE',timeout:2000},[id,actor.id]);
        const row=rows[0];if(!row)throw new NotFoundException('Agendamento não encontrado.');
        const current=await bloquearAcessoAdministrativo(c,actor,this.clock,[],['client']);
        if(row.situacao==='cancelado'){await c.commit();return ownItem(row,current.agora);}
        if(row.versao!==version)throw new ConflictException('Agendamento alterado. Atualize seus agendamentos.');
        const reason=cancelRestriction(row,current.agora);if(reason)throw new ConflictException(reason);
        await c.execute({sql:"UPDATE agendamentos SET situacao='cancelado',cancelado_em=?,motivo_cancelamento='Cancelado pelo cliente',atualizado_em=GREATEST(?,TIMESTAMPADD(MICROSECOND,1,atualizado_em)) WHERE id=? AND usuario_id=?",timeout:2000},[current.agora,current.agora,id,actor.id]);
        await c.execute({sql:"INSERT INTO registros_auditoria(id,usuario_id,nome_usuario,acao,entidade,entidade_id,detalhes,ocorrido_em) VALUES(?,?,?,'update','booking',?,?,?)",timeout:2000},[this.auditId(),actor.id,current.name,id,JSON.stringify({source:'cliente',action:'cancelamento',manualRefund:row.situacao_pagamento==='concluido'}),current.agora]);
        const [updated]=await c.execute<Row[]>({sql:select+' AND b.usuario_id=?',timeout:2000},[id,actor.id]);if(!updated[0])throw new Error('Agendamento ausente.');
        await c.commit();return ownItem(updated[0],current.agora);
      }catch(error:unknown){await c.rollback();throw error;}
    });
  }
  async consultarDia(roomId: string, inicio: Date, fim: Date) {
    return bancoAdministrativo(this.pool, async c => {
      const [rooms] = await c.execute<(RowDataPacket & { preco_por_hora: string })[]>({ sql:'SELECT preco_por_hora FROM salas WHERE id=?', timeout:2000 }, [roomId]);
      if (!rooms[0]) return null;
      const [busy] = await c.execute<(RowDataPacket & { inicio_em: Date; fim_em: Date })[]>({ sql:"SELECT inicio_em,fim_em FROM agendamentos WHERE sala_id=? AND situacao<>'cancelado' AND inicio_em<? AND fim_em>?", timeout:2000 }, [roomId,fim,inicio]);
      return { precoDecimal:rooms[0].preco_por_hora, ocupados:busy.map(row => ({ inicio:row.inicio_em, fim:row.fim_em })) };
    });
  }
  async criarPendente(actor: AtorAdministrativo, p: PedidoAgendamento) {
    return bancoAdministrativo(this.pool, async c => {
      await c.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'); await c.beginTransaction();
      try {
        await bloquearAcessoAdministrativo(c,actor,this.clock,[],['client']);
        const [existing] = await c.execute<Row[]>({ sql:select, timeout:2000 }, [p.requestId]);
        if (existing[0]) {
          const row = existing[0];
          const [history] = await c.execute<RowDataPacket[]>({ sql:"SELECT usuario_id,JSON_UNQUOTE(JSON_EXTRACT(detalhes,'$.source')) origem FROM registros_auditoria WHERE entidade='booking' AND entidade_id=? AND acao='create' ORDER BY ocorrido_em,id LIMIT 1", timeout:2000 }, [p.requestId]);
          if (row.usuario_id!==actor.id || row.sala_id!==p.roomId || row.inicio_em.getTime()!==p.periodo.inicio.getTime() || row.fim_em.getTime()!==p.periodo.fim.getTime() || history[0]?.usuario_id!==actor.id || history[0]?.origem!=='cliente') incompatible();
          await c.commit(); return { reserva:dto(row,this.clock.agora()), criada:false };
        }
        const [rooms] = await c.execute<(RowDataPacket & { preco_por_hora:string })[]>({ sql:'SELECT preco_por_hora FROM salas WHERE id=? FOR UPDATE', timeout:2000 }, [p.roomId]);
        if (!rooms[0]) throw new NotFoundException('Sala não encontrada.');
        const current = await bloquearAcessoAdministrativo(c,actor,this.clock,[],['client']);
        p.periodo.validarInicioFuturo(current.agora);
        const centavos = p.periodo.calcularCentavos(rooms[0].preco_por_hora);
        const [conflicts] = await c.execute<RowDataPacket[]>({ sql:"SELECT id FROM agendamentos WHERE sala_id=? AND situacao<>'cancelado' AND inicio_em<? AND fim_em>? LIMIT 1", timeout:2000 }, [p.roomId,p.periodo.fim,p.periodo.inicio]);
        if (conflicts.length) throw new ConflictException({ code:'HORARIO_OCUPADO', message:'O horário foi ocupado. Escolha outro período.' });
        await c.execute({ sql:"INSERT INTO agendamentos(id,usuario_id,sala_id,inicio_em,fim_em,situacao,situacao_pagamento,valor_acordado,horas_do_plano,criado_em,atualizado_em) VALUES(?,?,?,?,?,'pendente','pendente',?,0,?,?)", timeout:2000 }, [p.requestId,actor.id,p.roomId,p.periodo.inicio,p.periodo.fim,(centavos/100).toFixed(2),current.agora,current.agora]);
        await c.execute({ sql:"INSERT INTO registros_auditoria(id,usuario_id,nome_usuario,acao,entidade,entidade_id,detalhes,ocorrido_em) VALUES(?,?,?,'create','booking',?,?,?)", timeout:2000 }, [this.auditId(),actor.id,current.name,p.requestId,JSON.stringify({ source:'cliente', roomId:p.roomId }),current.agora]);
        const [created] = await c.execute<Row[]>({ sql:select, timeout:2000 }, [p.requestId]);
        if (!created[0]) throw new Error('Reserva ausente.');
        await c.commit(); return { reserva:dto(created[0],current.agora), criada:true };
      } catch (error: unknown) { await c.rollback(); throw error; }
    });
  }
}
