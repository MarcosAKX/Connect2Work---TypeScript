import type { TaskGateway } from '../contracts';
import type { Task, TaskStatus, CreateTaskInput, UpdateTaskInput, TaskBoardQuery, TaskBoardPage, TaskStaff } from '../../types/domain';
const failure = 'Não foi possível consultar as tarefas. Tente novamente.';
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(failure); return Object.fromEntries(Object.entries(value)); }
function text(value: unknown, max: number): string { if (typeof value !== 'string' || value.length > max) throw new Error(failure); return value; }
function id(value: unknown): string { const result = text(value, 36); if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(result)) throw new Error(failure); return result; }
function integer(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error(failure); return value; }
function version(value: unknown): string { const result = text(value, 26); if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(result)) throw new Error('Atualize o quadro antes de editar a tarefa.'); return result; }
function instant(value: unknown): string { const result = text(value, 40); if (!result.endsWith('Z') || !Number.isFinite(Date.parse(result))) throw new Error(failure); return result; }
function task(value: unknown): Task {
  const row = object(value);
  const status = row.status, priority = row.priority;
  if (status !== 'todo' && status !== 'in_progress' && status !== 'done' || priority !== 'low' && priority !== 'medium' && priority !== 'high') throw new Error(failure);
  let dueDate: string | undefined;
  if (row.dueDate !== undefined) {
    dueDate = text(row.dueDate, 10);
    if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(Date.parse(dueDate + 'T12:00:00Z')) || new Date(dueDate + 'T12:00:00Z').toISOString().slice(0, 10) !== dueDate) throw new Error(failure);
  }
  return { id: id(row.id), title: text(row.title, 200), status, priority, version: version(row.version), createdBy: id(row.createdBy), createdAt: instant(row.createdAt), updatedAt: instant(row.updatedAt),
    ...(row.description === undefined ? {} : { description: text(row.description, 1000) }), ...(row.assignedTo === undefined ? {} : { assignedTo: id(row.assignedTo) }), ...(dueDate === undefined ? {} : { dueDate }) };
}
export class TarefasHttpGateway implements TaskGateway {
  constructor(private readonly fetcher: typeof fetch = (input, init) => fetch(input, init), private readonly expired: () => void | Promise<unknown> = () => {}) {}
  private async request(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await this.fetcher('/api/admin/tarefas' + path, { method, credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-C2W-Request': '1' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      if (response.status === 401) { await this.expired(); throw new Error('Sessão encerrada. Faça login novamente.'); }
      if (response.status === 403) throw new Error('Acesso permitido somente à equipe.');
      if (response.status === 400) throw new Error('Confira os campos. O prazo só pode ser definido na criação.');
      if (response.status === 404) throw new Error('Tarefa não encontrada. Atualize o quadro.');
      if (response.status === 409) throw new Error('Tarefa alterada ou responsável indisponível. Atualize o quadro antes de repetir.');
      if (response.status === 429) throw new Error('Muitas solicitações. Aguarde um minuto.');
      if (!response.ok) throw new Error(method === 'GET' ? failure : 'Não foi possível confirmar o salvamento. Atualize o quadro antes de repetir.');
      return await response.json();
    } catch (error: unknown) {
      if (error instanceof Error && !['AbortError', 'TypeError', 'SyntaxError'].includes(error.name)) throw error;
      throw new Error(method === 'GET' ? failure : 'Não foi possível confirmar o salvamento. Atualize o quadro antes de repetir.');
    } finally { clearTimeout(timeout); }
  }
  async listTasks(): Promise<Task[]> { throw new Error('Use o quadro paginado para consultar as tarefas.'); }
  async listBoard(query: TaskBoardQuery): Promise<TaskBoardPage> {
    const row = object(await this.request('?' + new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize), ownership: query.ownership })));
    if (!Array.isArray(row.items) || row.items.length > query.pageSize || row.page !== query.page || row.pageSize !== query.pageSize) throw new Error(failure);
    const counts = object(row.counts); const total = integer(row.total);
    const items = row.items.map(task);
    const result = { items, total, page: query.page, pageSize: query.pageSize, counts: { todo: integer(counts.todo), in_progress: integer(counts.in_progress), done: integer(counts.done) } };
    if (new Set(items.map(item => item.id)).size !== items.length || result.counts.todo + result.counts.in_progress + result.counts.done !== total) throw new Error(failure);
    return result;
  }
  async listStaff(): Promise<TaskStaff[]> {
    const values = await this.request('/equipe');
    if (!Array.isArray(values) || values.length > 500) throw new Error(failure);
    return values.map(value => { const row = object(value); return { id: id(row.id), name: text(row.name, 150) }; });
  }
  async attentionCount(): Promise<number> { return integer(object(await this.request('/atencao')).count); }
  private fields(input: UpdateTaskInput) { return { title: input.title, description: input.description ?? '', assignedTo: input.assignedTo ?? null, priority: input.priority }; }
  async createTask(input: CreateTaskInput): Promise<Task> {
    if (!input.requestId) throw new Error('Reabra o formulário para criar a tarefa.');
    const created = task(await this.request('', 'POST', { ...this.fields(input), dueDate: input.dueDate ?? null, requestId: input.requestId }));
    if (created.id !== input.requestId) throw new Error(failure); return created;
  }
  async updateTask(taskId: string, input: UpdateTaskInput, _actor: string, expectedVersion?: string): Promise<Task> {
    const updated = task(await this.request('/' + encodeURIComponent(taskId), 'PATCH', { ...this.fields(input), expectedVersion: version(expectedVersion) }));
    if (updated.id !== taskId) throw new Error(failure); return updated;
  }
  async updateTaskStatus(taskId: string, status: TaskStatus, _actor: string, expectedVersion?: string): Promise<Task> {
    const updated = task(await this.request('/' + encodeURIComponent(taskId) + '/situacao', 'PATCH', { status, expectedVersion: version(expectedVersion) }));
    if (updated.id !== taskId) throw new Error(failure); return updated;
  }
  async deleteTask(taskId: string, _actor: string, expectedVersion?: string): Promise<void> {
    if (object(await this.request('/' + encodeURIComponent(taskId), 'DELETE', { expectedVersion: version(expectedVersion) })).deleted !== true) throw new Error(failure);
  }
}
