import { BadRequestException } from '@nestjs/common';
export const FUSO_COMERCIAL = 'America/Sao_Paulo';
const formato = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_COMERCIAL, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function partes(date: Date): Record<string, string> { return Object.fromEntries(formato.formatToParts(date).map(p => [p.type,p.value])); }
export function dataComercial(agora: Date): string { const p = partes(agora); return `${p.year}-${p.month}-${p.day}`; }
export function validarData(date: string): void {
  const parsed = new Date(date + 'T12:00:00.000Z');
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date) throw new BadRequestException('Data inválida.');
}
export function instanteComercial(date: string, hour: string): Date {
  validarData(date);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hour)) throw new BadRequestException('Horário inválido.');
  const target = Date.parse(`${date}T${hour}:00.000Z`);
  let candidate = target;
  for (let i=0;i<3;i++) {
    const p = partes(new Date(candidate));
    const displayed = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.000Z`);
    candidate += target - displayed;
  }
  const result = new Date(candidate); const p = partes(result);
  if (`${p.year}-${p.month}-${p.day}` !== date || `${p.hour}:${p.minute}` !== hour) throw new BadRequestException('Horário comercial inválido.');
  return result;
}
export function limitesDoDia(date: string): { inicio: Date; fim: Date } {
  // A consulta usa a janela comercial, sem converter meia-noite em dias com transição de fuso.
  return { inicio: instanteComercial(date,'08:00'), fim: instanteComercial(date,'21:00') };
}
