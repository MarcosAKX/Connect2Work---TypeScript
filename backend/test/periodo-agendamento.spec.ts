import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PeriodoAgendamento } from '../src/domain/periodo-agendamento';
import { dataComercial } from '../src/domain/horario-comercial';
test('período comercial valida calendário e limites sem depender do TZ do host', () => {
  for (const [date, slot] of [['2026-02-30','08:00 - 09:00'],['2026-10-20','08:30 - 10:00'],['2026-10-20','07:00 - 09:00'],['2026-10-20','20:00 - 22:00'],['2026-10-20','10:00 - 09:00'],['26-10-20','08:00 - 09:00']]) assert.throws(() => PeriodoAgendamento.criar(date ?? '', slot ?? ''));
  const p = PeriodoAgendamento.criar('2026-10-20','08:00 - 21:00');
  assert.equal(p.inicio.toISOString(),'2026-10-20T11:00:00.000Z'); assert.equal(p.fim.toISOString(),'2026-10-21T00:00:00.000Z'); assert.equal(p.horas,13);
  assert.equal(p.calcularCentavos('12.34'),16042);
  assert.throws(() => p.calcularCentavos('9999999999.99'));
  assert.throws(() => p.validarInicioFuturo(p.inicio));
  assert.equal(dataComercial(new Date('2026-10-20T01:00:00Z')),'2026-10-19');
});
