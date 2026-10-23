import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { ServicoAgendamentos } from '../src/services/servico-agendamentos';
import { AcessoAdministrativo } from '../src/security/acesso-administrativo';
import { TokenSessao } from '../src/security/token-sessao';
import { LimiteAgendamentos } from '../src/security/limite-agendamentos';
import type { RepositorioAgendamentos } from '../src/repositories/contracts/repositorio-agendamentos';

test('cliente consulta faixas sem dados alheios e não pode forjar valor, proprietário ou situação', async () => {
  const roomId = randomUUID(); const token = new TokenSessao().gerar().token;
  let role: 'client'|'admin' = 'client'; let logged = true; let creates = 0;
  const now = new Date('2030-10-21T10:00:00Z');
  const access = new AcessoAdministrativo({ async consultar() { return logged ? { user: { id: randomUUID(), name: 'Cliente', email: 'cliente@example.invalid', role, active: true, profession: '', phone: '', createdAt: now.toISOString(), hasHoursPlan: false, hoursBalance: 0 }, idleExpiresAt: '', absoluteExpiresAt: '' } : null; } });
  const repo: RepositorioAgendamentos = {
    async listarMeus(){throw new Error('Não utilizado');}, async cancelarMeu(){throw new Error('Não utilizado');},
    async consultarDia() { return { precoDecimal: '50.25', ocupados: [{ inicio: new Date('2030-10-21T12:00:00Z'), fim: new Date('2030-10-21T13:00:00Z') }] }; },
    async criarPendente() { creates++; throw new Error('não deve gravar inválidos'); },
  };
  const service = new ServicoAgendamentos(repo, access, { agora: () => now });
  const day = await service.disponibilidade(token, roomId, { data: '2030-10-21' });
  assert.equal(day.slots.length, 13); assert.equal(day.pricePerHour, 50.25);
  assert.equal(day.slots[0]?.available, true); assert.equal(day.slots[1]?.available, false); assert.equal(day.slots[2]?.available, true);
  assert.equal(JSON.stringify(day).includes('userId'), false);
  const input = { requestId: randomUUID(), roomId, date: '2030-10-21', timeSlot: '08:00 - 09:00' };
  for (const extra of [{ total: 0 }, { userId: randomUUID() }, { status: 'confirmed' }, { hoursFromPlan: 5 }, { paymentStatus: 'completed' }]) await assert.rejects(service.criar(token, { ...input, ...extra }), { status: 400 });
  await assert.rejects(service.criar(token, { ...input, requestId: 'a' }), { status: 400 });
  role = 'admin'; await assert.rejects(service.criar(token, input), { status: 403 });
  logged = false; await assert.rejects(service.disponibilidade(token, roomId, { data: '2030-10-21' }), { status: 401 });
  assert.equal(creates, 0);
});

test('limites de cliente separam consulta e criação e liberam após um minuto', () => {
  let now = new Date('2030-10-21T10:00:00Z'); const limit = new LimiteAgendamentos({ agora: () => now });
  for (let i=0;i<10;i++) limit.verificar('cliente', true);
  assert.throws(() => limit.verificar('cliente', true), { status: 429 });
  for (let i=0;i<60;i++) limit.verificar('cliente', false);
  assert.throws(() => limit.verificar('cliente', false), { status: 429 });
  now = new Date(now.getTime()+60000); limit.verificar('cliente', true);
});
