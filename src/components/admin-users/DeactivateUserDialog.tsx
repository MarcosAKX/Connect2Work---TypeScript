import type { AdminUsersViewModel } from '../../hooks/useAdminUsersPage';

type DeactivateUserProps = Pick<
  AdminUsersViewModel,
  'admin' | 'deactivateDialogRef' | 'deactivatingUser' | 'setDeactivatingUser' | 'confirmDeactivate'
>;

export function DeactivateUserDialog({
  admin, deactivateDialogRef, deactivatingUser, setDeactivatingUser, confirmDeactivate,
}: DeactivateUserProps) {
  return (
    <dialog
      ref={deactivateDialogRef}
      className="admin-users-modal"
      aria-labelledby="deactivate-user-title"
      onCancel={() => setDeactivatingUser(null)}
    >
      <div>
        <h2 id="deactivate-user-title">Desativar usuário?</h2>
        <p><strong>{deactivatingUser?.name}</strong> perderá o acesso ao sistema. A conta poderá ser reativada depois.</p>
        <footer>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDeactivatingUser(null)}
            disabled={Boolean(admin.savingId)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn admin-users-danger"
            onClick={() => void confirmDeactivate()}
            disabled={Boolean(admin.savingId)}
          >
            {admin.savingId ? 'Desativando…' : 'Desativar'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
