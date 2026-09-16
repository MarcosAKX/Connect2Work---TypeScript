import { CheckCircleIcon, ClockIcon, TaskIcon } from '../icons';
import type { TaskStatus } from '../../types/domain';
import type { AdminTasksViewModel } from '../../hooks/useAdminTasksPage';
import { TaskCard } from './TaskCard';

const columns: Array<{ status: TaskStatus; label: string; icon: typeof TaskIcon }> = [
  { status: 'todo', label: 'A Fazer', icon: TaskIcon },
  { status: 'in_progress', label: 'Em Andamento', icon: ClockIcon },
  { status: 'done', label: 'Concluído', icon: CheckCircleIcon },
];

type TaskBoardProps = Pick<
  AdminTasksViewModel,
  | 'taskColumns' | 'dropTarget' | 'setDropTarget' | 'handleDrop' | 'loading'
  | 'filter' | 'staff' | 'isAdmin' | 'currentUserId' | 'draggedId'
  | 'handleDragStart' | 'endDrag' | 'openEdit'
>;

export function TaskBoard({
  taskColumns, dropTarget, setDropTarget, handleDrop, loading, filter,
  staff, isAdmin, currentUserId, draggedId, handleDragStart, endDrag, openEdit,
}: TaskBoardProps) {
  return (
    <section className="admin-task-board" aria-label="Quadro de tarefas">
      {columns.map(({ status, label, icon: Icon }) => {
        const items = taskColumns[status];
        return (
          <section
            key={status}
            className={`admin-task-column${dropTarget === status ? ' is-drop-target' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropTarget(status);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget instanceof Node ? event.relatedTarget : null)) {
                setDropTarget(null);
              }
            }}
            onDrop={(event) => { void handleDrop(event, status); }}
          >
            <header>
              <span><Icon width="17" height="17" />{label}</span>
              <strong>{items.length}</strong>
            </header>
            <div className="admin-task-column__list">
              {loading && <><i className="admin-task-skeleton" /><i className="admin-task-skeleton" /></>}
              {!loading && items.length === 0 && (
                <p className="admin-task-empty">
                  {filter === 'mine' ? 'Nenhuma tarefa sua nesta etapa' : 'Nenhuma tarefa nesta etapa'}
                </p>
              )}
              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  staff={staff}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                  draggedId={draggedId}
                  handleDragStart={handleDragStart}
                  endDrag={endDrag}
                  openEdit={openEdit}
                />
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
