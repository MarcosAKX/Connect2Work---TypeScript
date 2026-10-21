import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { services } from '../../services';
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput, TaskStaff, TaskBoardPage } from '../../types/domain';
import { countAttentionTasks, TASKS_CHANGED_EVENT } from '../../utils/tasks';

export type TaskOwnershipFilter = 'all' | 'mine';
export function useAdminTasks(currentUserId: string) {
  const remote = Boolean(services.tasks.listBoard);
  const sequence = useRef(0);
  const writing = useRef(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<TaskStaff[]>([]);
  const [filter, setFilter] = useState<TaskOwnershipFilter>('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<TaskBoardPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (showLoading = true) => {
    const request = ++sequence.current;
    if (showLoading) setLoading(true);
    setError('');
    try {
      if (services.tasks.listBoard && services.tasks.listStaff) {
        const [board, people] = await Promise.all([services.tasks.listBoard({ page, pageSize: 30, ownership: filter }), services.tasks.listStaff()]);
        if (request !== sequence.current) return;
        setTasks(board.items); setStaff(people); setResult(board);
        if (!board.items.length && page > 1) setPage(value => value - 1);
      } else {
        const [items, users] = await Promise.all([services.tasks.listTasks(), services.users.listUsers()]);
        if (request !== sequence.current) return;
        setTasks(items);
        setStaff(users.filter(person => person.active && (person.role === 'admin' || person.role === 'secretaria')).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      }
    } catch (cause: unknown) {
      if (request === sequence.current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as tarefas.');
    } finally { if (request === sequence.current) setLoading(false); }
  }, [page, filter]);
  const latestLoad = useRef(load);
  useEffect(() => { latestLoad.current = load; void load(); return () => { sequence.current++; }; }, [load]);
  useEffect(() => {
    if (!remote) return;
    const timer = window.setInterval(() => { if (!writing.current) void latestLoad.current(false); }, 60000);
    return () => window.clearInterval(timer);
  }, [remote]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visibleTasks = useMemo(() => remote || filter === 'all' ? tasks : tasks.filter(task => task.assignedTo === currentUserId), [currentUserId, filter, tasks, remote]);
  const columns = useMemo(() => ({ todo: visibleTasks.filter(task => task.status === 'todo'), in_progress: visibleTasks.filter(task => task.status === 'in_progress'), done: visibleTasks.filter(task => task.status === 'done') }), [visibleTasks]);
  async function mutate(action: () => Promise<unknown>, message: string) {
    if (writing.current) return false;
    writing.current = true; sequence.current++; setSaving(true); setError(''); setLoading(false);
    try {
      await action();
      setNotice(message);
      await latestLoad.current(false);
      if (remote) window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));
      return true;
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível confirmar a operação. Atualize o quadro.');
      return false;
    } finally { writing.current = false; setSaving(false); }
  }
  function createTask(input: Omit<CreateTaskInput, 'createdBy'>) {
    return mutate(() => services.tasks.createTask({ ...input, createdBy: currentUserId }), 'Tarefa criada com sucesso.');
  }
  function updateTask(id: string, input: UpdateTaskInput, version?: string) {
    return mutate(() => services.tasks.updateTask(id, input, currentUserId, version), 'Tarefa atualizada.');
  }
  function moveTask(id: string, status: TaskStatus) {
    const current = tasks.find(task => task.id === id);
    if (!current) return Promise.resolve(false);
    if (current.status === status) return Promise.resolve(true);
    return mutate(() => services.tasks.updateTaskStatus(id, status, currentUserId, current.version), 'Tarefa movida.');
  }
  function deleteTask(id: string, version?: string) {
    return mutate(() => services.tasks.deleteTask(id, currentUserId, version), 'Tarefa excluída.');
  }
  return { tasks: visibleTasks, columns, staff, filter, setFilter: (value: TaskOwnershipFilter) => { setFilter(value); setPage(1); },
    page, setPage, remoteMode: remote, total: result?.total ?? visibleTasks.length,
    columnCounts: result?.counts ?? { todo: columns.todo.length, in_progress: columns.in_progress.length, done: columns.done.length },
    loading, saving, error, notice, load, createTask, updateTask, moveTask, deleteTask };
}

export function useTaskAttentionCount(enabled = true) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) { setCount(0); return; }
    let alive = true; let sequence = 0;
    async function refresh() {
      const request = ++sequence;
      try {
        const total = services.tasks.attentionCount ? await services.tasks.attentionCount() : countAttentionTasks(await services.tasks.listTasks());
        if (alive && request === sequence) setCount(total);
      } catch { if (alive && request === sequence) setCount(0); }
    }
    void refresh();
    const changed = () => { void refresh(); };
    window.addEventListener(TASKS_CHANGED_EVENT, changed);
    const timer = window.setInterval(changed, 60000);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener(TASKS_CHANGED_EVENT, changed); };
  }, [enabled]);
  return count;
}
