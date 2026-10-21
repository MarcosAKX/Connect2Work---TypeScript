import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { TaskCard } from '../TaskCard';
import { getTaskDueState } from '../../../utils/tasks';
import type { Task } from '../../../types/domain';
const base: Task = { id: 't', title: 'Conferir sala', status: 'todo', priority: 'medium', createdBy: 'u', createdAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-20T12:00:00Z' };
afterEach(() => vi.useRealTimers());
function markup(task: Task) { return renderToStaticMarkup(<TaskCard task={task} staff={[]} saving={false} draggedId={null} handleDragStart={() => {}} endDrag={() => {}} openEdit={() => {}} />); }
it('cartão indica prazo também por texto e mantém movimentação sem seletor', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
  expect(markup({ ...base, dueDate: '2026-10-21' })).toContain('No prazo');
  expect(markup({ ...base, dueDate: '2026-10-20' })).toContain('Vence em até 24h');
  expect(markup({ ...base, dueDate: '2026-10-19' })).toContain('Atrasada');
  expect(markup(base)).not.toContain('<select');
});
it('limite do prazo é a virada do dia de São Paulo, não a meia-noite UTC', () => {
  const task = { ...base, dueDate: '2026-10-20' };
  expect(getTaskDueState(task, new Date('2026-10-20T02:59:59.999Z'))).toBe('future');
  expect(getTaskDueState(task, new Date('2026-10-20T03:00:00Z'))).toBe('today');
  expect(getTaskDueState(task, new Date('2026-10-21T02:59:59.999Z'))).toBe('today');
  expect(getTaskDueState(task, new Date('2026-10-21T03:00:00Z'))).toBe('overdue');
  expect(getTaskDueState({ ...task, status: 'done' }, new Date('2026-10-21T03:00:00Z'))).toBe('none');
  expect(getTaskDueState(base, new Date('2026-10-21T03:00:00Z'))).toBe('none');
});
