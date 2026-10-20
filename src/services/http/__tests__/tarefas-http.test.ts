import { expect, it, vi } from 'vitest';
import { TarefasHttpGateway } from '../tarefas-http';
const id = '12345678-1234-4234-8234-123456789012';
const task = { id, title: 'Tarefa', status: 'todo', priority: 'medium', createdBy: id, createdAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-20T12:00:00Z', version: '2026-10-20 12:00:00.000001', dueDate: '2026-10-21' };
it('edição envia versão sem prazo nem identidade forjável', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(task)));
  const gateway = new TarefasHttpGateway(fetcher);
  await gateway.updateTask(id, { title: 'Tarefa', priority: 'medium', dueDate: '2030-01-01' }, 'ator-nao-enviado', task.version);
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({ title: 'Tarefa', description: '', assignedTo: null, priority: 'medium', expectedVersion: task.version });
  expect(fetcher.mock.calls[0]?.[1]?.credentials).toBe('include');
});
it('conflito não parece sucesso e 401 revalida sessão', async () => {
  const expired = vi.fn();
  const gateway = new TarefasHttpGateway(vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('{}', { status: 409 })).mockResolvedValueOnce(new Response('{}', { status: 401 })), expired);
  await expect(gateway.updateTaskStatus(id, 'done', id, task.version)).rejects.toThrow('Atualize');
  await expect(gateway.attentionCount()).rejects.toThrow('Sessão');
  expect(expired).toHaveBeenCalledOnce();
});
