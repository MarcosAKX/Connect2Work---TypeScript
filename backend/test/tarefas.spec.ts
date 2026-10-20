import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarTarefa, editarTarefa, consultaTarefas, mudarSituacao } from '../src/services/validacao-tarefas';

const version = '2026-10-20 12:00:00.000001';
const body = { title: 'Conferir salas', description: '', assignedTo: null, priority: 'medium' };
test('tarefas validam criação e data real; edição não admite prazo ou autor nem situação', () => {
  assert.equal(criarTarefa({ ...body, requestId: '12345678-1234-4234-8234-123456789012', dueDate: '2028-02-29' }).dueDate, '2028-02-29');
  assert.throws(() => criarTarefa({ ...body, requestId: '12345678-1234-4234-8234-123456789012', dueDate: '2027-02-29' }), { status: 400 });
  for (const extra of [{ dueDate: '2028-02-29' }, { dueDate: null }, { createdBy: 'outro' }, { status: 'done' }]) assert.throws(() => editarTarefa({ ...body, expectedVersion: version, ...extra }), { status: 400 });
  assert.equal(editarTarefa({ ...body, expectedVersion: version }).priority, 'medium');
  assert.throws(() => mudarSituacao({ status: 'outro', expectedVersion: version }), { status: 400 });
  assert.throws(() => consultaTarefas({ ownership: 'outro' }), { status: 400 });
  assert.throws(() => consultaTarefas({ pageSize: '101' }), { status: 400 });
});
