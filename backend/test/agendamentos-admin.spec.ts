import assert from 'node:assert/strict';
import { test } from 'node:test';
import { consultaAgendamentos, criacaoAgendamento, acaoAgendamento } from '../src/services/validacao-agendamentos-administrativos';
test('admin agendamentos valida filtros, corpo estrito, centavos e versões', () => {
  const requestId='12cb4430-5bf9-4ad6-9dc8-e6150982e98d';
  const body={requestId,clientId:requestId,roomId:requestId,date:'2026-11-20',timeSlot:'08:00 - 10:00',total:'50.01',paymentStatus:'pending'};
  assert.equal(criacaoAgendamento(body).centavos,5001);
  for (const change of [{total:-1},{total:'1.234'},{total:'1e4'},{total:'10000000000.00'},{paymentStatus:'done'},{hoursFromPlan:2},{userId:requestId},{requestId:'bad'},{date:'2026-02-30'}]) assert.throws(()=>criacaoAgendamento({...body,...change}));
  assert.equal(consultaAgendamentos({page:'2',pageSize:'20'}).page,2);
  for(const q of [{page:'0'},{pageSize:'101'},{dateFrom:'2026-02-30'},{dateFrom:'2026-12-01',dateTo:'2026-11-01'},{operational:'bad'},{status:'bad'},{owner:requestId}]) assert.throws(()=>consultaAgendamentos(q));
  assert.throws(()=>acaoAgendamento('cancelamento',{expectedVersion:'2026-10-19 12:00:00.000001',reason:' '}));
  assert.throws(()=>acaoAgendamento('chegada',{expectedVersion:'bad',checkedInBy:requestId}));
});
