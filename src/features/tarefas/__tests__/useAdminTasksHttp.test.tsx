import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { useAdminTasksPage } from '../useAdminTasksPage';
import { TaskEditorDialog } from '../TaskEditorDialog';
import type { Task, UserRole } from '../../../types/domain';
import { useAdminTasks } from '../useAdminTasks';
const mocks = vi.hoisted(() => ({ list: vi.fn(), staff: vi.fn(), update: vi.fn(), move: vi.fn(), users: vi.fn(), all: vi.fn() }));
vi.mock('../../../services', () => ({ services: { tasks: { listBoard: mocks.list, listStaff: mocks.staff, listTasks: mocks.all, updateTask: mocks.update, updateTaskStatus: mocks.move }, users: { listUsers: mocks.users } } }));
const task = { id: 't', title: 'Compartilhada', status: 'todo', priority: 'medium', createdBy: 'outro', dueDate: '2026-10-21', createdAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-20T12:00:00Z', version: 'old' };
const page = { items: [task], total: 90, page: 1, pageSize: 30, counts: { todo: 90, in_progress: 0, done: 0 } };
let container: HTMLDivElement; let root: Root; let model: ReturnType<typeof useAdminTasks>;
function Probe() { model = useAdminTasks('secretaria'); return null; }
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); container = document.createElement('div'); root = createRoot(container); mocks.list.mockReset().mockResolvedValue(page); mocks.staff.mockReset().mockResolvedValue([{ id: 'secretaria', name: 'Equipe' }]); mocks.update.mockReset().mockResolvedValue({ ...task, title: 'Editada' }); mocks.move.mockReset().mockRejectedValue(new Error('Conflito')); mocks.users.mockReset().mockResolvedValue([]); mocks.all.mockReset().mockResolvedValue([]); });
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'); });
it('quadro HTTP usa página, totais e equipe mínima; edição envia versão capturada', async () => {
  await act(async () => root.render(<Probe />));
  expect(model.total).toBe(90); expect(model.tasks).toHaveLength(1);
  expect(mocks.users).not.toHaveBeenCalled(); expect(mocks.all).not.toHaveBeenCalled();
  await act(async () => { expect(await model.updateTask('t', { title: 'Editada', priority: 'medium', dueDate: '2026-10-21' }, 'capturada')).toBe(true); });
  expect(mocks.update).toHaveBeenCalledWith('t', expect.anything(), 'secretaria', 'capturada');
});
it('falha ao mover não sobrescreve o quadro com rollback antigo', async () => {
  await act(async () => root.render(<Probe />));
  await act(async () => { expect(await model.moveTask('t', 'done')).toBe(false); });
  expect(model.tasks[0]?.status).toBe('todo');
  expect(model.error).toBe('Conflito');
});

let pageModel: ReturnType<typeof useAdminTasksPage>;
function PageProbe({ role }: { role: UserRole }) {
  pageModel = useAdminTasksPage({ id: 'equipe', name: 'Equipe', email: 'equipe@example.invalid', role, active: true, createdAt: '2026-10-20T12:00:00Z', hasHoursPlan: false, hoursBalance: 0 });
  return <TaskEditorDialog {...pageModel} />;
}
it.each(['admin', 'secretaria'] as const)('%s abre tarefa de outra pessoa com prazo desabilitado', async role => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn() });
  const other: Task = { ...task, status: 'todo', priority: 'medium' };
  await act(async () => root.render(<PageProbe role={role} />));
  await act(async () => pageModel.openEdit(other));
  expect(pageModel.editingTask?.createdBy).toBe('outro');
  expect(container.querySelector('input[type="date"]')?.hasAttribute('disabled')).toBe(true);
  vi.restoreAllMocks();
});
