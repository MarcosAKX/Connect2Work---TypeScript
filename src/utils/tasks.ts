import type { Task } from '../types/domain';

export const TASKS_CHANGED_EVENT = 'c2w:tasks-changed';
export type TaskDueState = 'overdue' | 'today' | 'future' | 'none';

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getTaskDueState(task: Task, current = new Date()): TaskDueState {
  if (!task.dueDate || task.status === 'done') return 'none';
  const today = localDateKey(current);
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate === today) return 'today';
  return 'future';
}

export function countAttentionTasks(tasks: Task[], current = new Date()) {
  return tasks.filter((task) => {
    const state = getTaskDueState(task, current);
    return state === 'overdue' || state === 'today';
  }).length;
}

export function formatTaskDueDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
}
