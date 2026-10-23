import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { RepositorioAgendamentos } from '../repositories/contracts/repositorio-agendamentos';
import type { AcessoAdministrativo } from '../security/acesso-administrativo';
import { RelogioSistema, type Relogio } from '../security/relogio';
import { LimiteAgendamentos } from '../security/limite-agendamentos';
import { objeto, texto, uuid, versao } from './validacao-usuario-administrativo';
import { consultaMeusAgendamentos } from './validacao-meus-agendamentos';
import { PeriodoAgendamento } from '../domain/periodo-agendamento';
import { limitesDoDia, instanteComercial } from '../domain/horario-comercial';
import type { DisponibilidadeDto } from '../dto/agendamento.dto';

export class ServicoAgendamentos {
  private readonly limit: LimiteAgendamentos;
  constructor(private readonly repo: RepositorioAgendamentos, private readonly access: Pick<AcessoAdministrativo,'exigir'>, private readonly clock: Relogio = new RelogioSistema()) { this.limit = new LimiteAgendamentos(clock); }
  async disponibilidade(token: string|null, roomId: string, query: unknown): Promise<DisponibilidadeDto> {
    const actor = await this.access.exigir(token, ['client', 'admin', 'secretaria']); this.limit.verificar(actor.id, false);
    uuid(roomId); const body = objeto(query, ['data']); const date = texto(body.data, 10); const range = limitesDoDia(date);
    const day = await this.repo.consultarDia(roomId, range.inicio, range.fim);
    if (!day) throw new NotFoundException('Sala não encontrada.');
    const now = this.clock.agora();
    const slots = Array.from({ length: 13 }, (_, i) => {
      const start = `${String(8+i).padStart(2,'0')}:00`, end = `${String(9+i).padStart(2,'0')}:00`;
      const first = instanteComercial(date, start), last = instanteComercial(date, end);
      return { start, end, available: first > now && !day.ocupados.some(b => b.inicio < last && b.fim > first) };
    });
    const pricePerHour = PeriodoAgendamento.criar(date, '08:00 - 09:00').calcularCentavos(day.precoDecimal)/100;
    return { roomId, date, timeZone: 'America/Sao_Paulo', serverNow: now.toISOString(), pricePerHour, slots };
  }
  async criar(token: string|null, input: unknown) {
    const actor = await this.access.exigir(token, ['client']); this.limit.verificar(actor.id, true);
    const body = objeto(input, ['requestId', 'roomId', 'date', 'timeSlot']);
    const requestId = texto(body.requestId,36);
    if (!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/.test(requestId)) throw new BadRequestException('Identificador inválido.');
    return this.repo.criarPendente(actor, { requestId, roomId: uuid(texto(body.roomId,36)), periodo: PeriodoAgendamento.criar(texto(body.date,10),texto(body.timeSlot,13)) });
  }
  async meus(token:string|null,query:unknown) {
    const actor=await this.access.exigir(token,['client']);this.limit.verificar(actor.id,false);
    return this.repo.listarMeus(actor,consultaMeusAgendamentos(query));
  }
  async cancelar(token:string|null,id:string,input:unknown) {
    const actor=await this.access.exigir(token,['client']);this.limit.verificar(actor.id,true);
    return this.repo.cancelarMeu(actor,uuid(id),versao(objeto(input,['expectedVersion']).expectedVersion));
  }
}
