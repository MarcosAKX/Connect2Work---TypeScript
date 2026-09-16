import { TrashIcon } from '../icons';
import type { AdminTasksViewModel } from '../../hooks/useAdminTasksPage';

type TaskDeleteProps = Pick<
  AdminTasksViewModel,
  'deleteRef' | 'deleteTarget' | 'setDeleteTarget' | 'saving' | 'confirmDelete'
>;

export function TaskDeleteDialog({
  deleteRef, deleteTarget, setDeleteTarget, saving, confirmDelete,
}: TaskDeleteProps) {
  return (
    <dialog
      ref={deleteRef}
      className="admin-task-modal admin-task-modal--delete"
      onClose={() => setDeleteTarget(null)}
    >
      <div>
        <TrashIcon width="24" height="24" />
        <h2>Excluir tarefa?</h2>
        <p>Tem certeza que deseja excluir <strong>{deleteTarget?.title}</strong>? Esta ação não pode ser desfeita.</p>
        <footer>
          <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn admin-task-confirm-delete"
            disabled={saving}
            onClick={() => { void confirmDelete(); }}
          >
            Excluir
          </button>
        </footer>
      </div>
    </dialog>
  );
}
