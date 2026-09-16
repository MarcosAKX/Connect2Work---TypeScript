import { ClockIcon, LockIcon, UserIcon } from '../icons';
import type { Task, TaskPriority } from '../../types/domain';
import type { AdminTasksViewModel } from '../../hooks/useAdminTasksPage';
import { formatTaskDueDate, getTaskDueState } from '../../utils/tasks';

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta',
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

type TaskCardProps = Pick<
  AdminTasksViewModel,
  | 'staff' | 'isAdmin' | 'currentUserId' | 'draggedId'
  | 'handleDragStart' | 'endDrag' | 'openEdit'
> & { task: Task };

export function TaskCard({
  task, staff, isAdmin, currentUserId, draggedId, handleDragStart, endDrag, openEdit,
}: TaskCardProps) {
  const assignee = staff.find((person) => person.id === task.assignedTo);
  const creator = staff.find((person) => person.id === task.createdBy);
  const canEditContent = isAdmin || task.createdBy === currentUserId;
  const dueState = getTaskDueState(task);

  return (
    <article
      key={task.id}
      className={`admin-task-card is-${task.priority}${dueState !== 'none' ? ` due-${dueState}` : ''}${draggedId === task.id ? ' is-dragging' : ''}${canEditContent ? '' : ' is-limited'}`}
      draggable
      tabIndex={canEditContent ? 0 : undefined}
      title={canEditContent ? 'Abrir para editar' : `Criada por ${creator?.name ?? 'outro usuário'}. Somente o autor ou um administrador pode editar.`}
      onDragStart={(event) => handleDragStart(event, task.id)}
      onDragEnd={endDrag}
      onClick={() => { if (canEditContent) openEdit(task); }}
      onKeyDown={(event) => {
        if (canEditContent && (event.key === 'Enter' || event.key === ' ')) {
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
      {!canEditContent && (
        <span className="admin-task-readonly"><LockIcon width="12" height="12" />Somente visualização</span>
      )}
      <h2>{task.title}</h2>
      {task.description && <p>{task.description}</p>}
      <footer>
        {assignee ? (
          <span className="admin-task-assignee" title={assignee.name}>
            <i>{initials(assignee.name)}</i>{assignee.name}
          </span>
        ) : (
          <span className="admin-task-unassigned"><UserIcon width="14" height="14" />Sem responsável</span>
        )}
        {task.dueDate && (
          <time dateTime={task.dueDate}><ClockIcon width="14" height="14" />{formatTaskDueDate(task.dueDate)}</time>
        )}
      </footer>
    </article>
  );
}
