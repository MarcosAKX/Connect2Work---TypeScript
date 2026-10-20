import { ClockIcon, UserIcon } from '../../components/icons';
import type { Task, TaskPriority } from '../../types/domain';
import type { AdminTasksViewModel } from './useAdminTasksPage';
import { formatTaskDueDate, getTaskDueState } from '../../utils/tasks';

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta',
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

type TaskCardProps = Pick<
  AdminTasksViewModel,
  | 'staff' | 'saving' | 'moveTask' | 'draggedId'
  | 'handleDragStart' | 'endDrag' | 'openEdit'
> & { task: Task };

export function TaskCard({
  task, staff, saving, moveTask, draggedId, handleDragStart, endDrag, openEdit,
}: TaskCardProps) {
  const assignee = staff.find((person) => person.id === task.assignedTo);
  const dueState = getTaskDueState(task);

  return (
    <article
      key={task.id}
      className={`admin-task-card is-${task.priority}${dueState !== 'none' ? ` due-${dueState}` : ''}${draggedId === task.id ? ' is-dragging' : ''}`}
      draggable={!saving}
      tabIndex={0}
      title="Abrir para editar"
      onDragStart={(event) => handleDragStart(event, task.id)}
      onDragEnd={endDrag}
      onClick={() => { if (!saving) openEdit(task); }}
      onKeyDown={(event) => {
        if (!saving && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          openEdit(task);
        }
      }}
    >
      <div className="admin-task-card__top">
        <span className={`admin-task-priority is-${task.priority}`}>{priorityLabels[task.priority]}</span>
        {dueState === 'overdue' && <span className="admin-task-alert">Atrasada</span>}
        {dueState === 'today' && <span className="admin-task-alert">Vence hoje</span>}
      </div>
      <h2>{task.title}</h2>
      {task.description && <p>{task.description}</p>}
      <label onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
        Situação
        <select aria-label={`Situação de ${task.title}`} value={task.status} disabled={saving} onChange={event => {
          const value = event.target.value;
          if (value === 'todo' || value === 'in_progress' || value === 'done') void moveTask(task.id, value);
        }}>
          <option value="todo">A Fazer</option><option value="in_progress">Em Andamento</option><option value="done">Concluído</option>
        </select>
      </label>
      <footer>
        {assignee ? (
          <span className="admin-task-assignee" title={assignee.name}>
            <i>{initials(assignee.name)}</i>{assignee.name}
          </span>
        ) : (
          <span className="admin-task-unassigned"><UserIcon width="14" height="14" />{task.assignedTo ? 'Responsável indisponível' : 'Sem responsável'}</span>
        )}
        {task.dueDate && (
          <time dateTime={task.dueDate}><ClockIcon width="14" height="14" />{formatTaskDueDate(task.dueDate)}</time>
        )}
      </footer>
    </article>
  );
}
