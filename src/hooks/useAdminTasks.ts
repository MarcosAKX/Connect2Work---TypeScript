import { useCallback, useEffect, useMemo, useState } from 'react';
import { services } from '../services';
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput, User } from '../types/domain';
import { countAttentionTasks, TASKS_CHANGED_EVENT } from '../utils/tasks';

export type TaskOwnershipFilter = 'all' | 'mine';

export function useAdminTasks(currentUserId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [filter, setFilter] = useState<TaskOwnershipFilter>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [taskList, users] = await Promise.all([services.tasks.listTasks(), services.users.listUsers()]);
      setTasks(taskList);
      setStaff(users.filter((user) => user.active && (user.role === 'admin' || user.role === 'secretaria')).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as tarefas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visibleTasks = useMemo(
    () => filter === 'mine' ? tasks.filter((task) => task.assignedTo === currentUserId) : tasks,
    [currentUserId, filter, tasks],
  );

  const columns = useMemo(() => ({
    todo: visibleTasks.filter((task) => task.status === 'todo'),
    in_progress: visibleTasks.filter((task) => task.status === 'in_progress'),
    done: visibleTasks.filter((task) => task.status === 'done'),
  }), [visibleTasks]);

  const createTask = useCallback(async (input: Omit<CreateTaskInput, 'createdBy'>) => {
    setSaving(true);
    setError('');
    try {
      const created = await services.tasks.createTask({ ...input, createdBy: currentUserId });
      setTasks((current) => [created, ...current]);
      setNotice('Tarefa criada com sucesso.');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar a tarefa.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [currentUserId]);

  const updateTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    setSaving(true);
    setError('');
    try {
      const updated = await services.tasks.updateTask(id, input, currentUserId);
      setTasks((current) => current.map((task) => task.id === id ? updated : task));
      setNotice('Tarefa atualizada.');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a tarefa.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [currentUserId]);

  const moveTask = useCallback(async (id: string, status: TaskStatus) => {
    const previous = tasks;
    const currentTask = tasks.find((task) => task.id === id);
    if (!currentTask || currentTask.status === status) return true;
    setError('');
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
    try {
      const updated = await services.tasks.updateTaskStatus(id, status, currentUserId);
      setTasks((current) => current.map((task) => task.id === id ? updated : task));
      return true;
    } catch (cause) {
      setTasks(previous);
      setError(cause instanceof Error ? cause.message : 'Não foi possível mover a tarefa.');
      return false;
    }
  }, [currentUserId, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    setSaving(true);
    setError('');
    try {
      await services.tasks.deleteTask(id, currentUserId);
      setTasks((current) => current.filter((task) => task.id !== id));
      setNotice('Tarefa excluída.');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir a tarefa.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [currentUserId]);

  return { tasks: visibleTasks, columns, staff, filter, setFilter, loading, saving, error, notice, load, createTask, updateTask, moveTask, deleteTask };
}

export function useTaskAttentionCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setCount(countAttentionTasks(await services.tasks.listTasks()));
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handleChange = () => { void refresh(); };
    window.addEventListener(TASKS_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, handleChange);
  }, [refresh]);

  return count;
}
