import { BadRequestException } from '@nestjs/common';
import { instanteComercial } from './horario-comercial';
export class PeriodoAgendamento {
  private constructor(readonly date: string, readonly timeSlot: string, readonly inicio: Date, readonly fim: Date, readonly horas: number) {}
  static criar(date: string, timeSlot: string): PeriodoAgendamento {
    const match = /^(\d{2}):00 - (\d{2}):00$/.exec(timeSlot);
    const first = Number(match?.[1]); const last = Number(match?.[2]);
    if (!match || first < 8 || last > 21 || first >= last) throw new BadRequestException('Período inválido.');
    return new PeriodoAgendamento(date,timeSlot,instanteComercial(date,`${match[1]}:00`),instanteComercial(date,`${match[2]}:00`),last-first);
  }
  validarInicioFuturo(agora: Date): void { if (this.inicio <= agora) throw new BadRequestException('Escolha um horário futuro.'); }
  calcularCentavos(precoDecimal: string): number {
    if (!/^\d{1,10}\.\d{2}$/.test(precoDecimal)) throw new Error('Preço inválido.');
    const [inteiro,fracao] = precoDecimal.split('.');
    const total = (Number(inteiro)*100+Number(fracao))*this.horas;
    if (!Number.isSafeInteger(total) || total<0 || total>999999999999) throw new BadRequestException('Valor do período excede o limite.');
    return total;
  }
}
