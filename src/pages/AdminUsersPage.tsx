import { Link } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, PlusIcon, UsersIcon } from '../components/icons';
import { useAdminUsersPage } from '../hooks/useAdminUsersPage';
import { useAuth } from '../state/AuthContext';
import { UserFormDialog } from '../components/admin-users/UserFormDialog';
import { UserStats } from '../components/admin-users/UserStats';
import { UserFilters } from '../components/admin-users/UserFilters';
import { UserTable } from '../components/admin-users/UserTable';
import { DeactivateUserDialog } from '../components/admin-users/DeactivateUserDialog';
import '../assets/css/pages/admin-users.css';

export function AdminUsersPage() {
  const { user: currentUser, refreshUser } = useAuth();
  const model = useAdminUsersPage(currentUser, refreshUser);
  const { admin, formUser } = model;

  return (
    <main className="admin-users-page">
      <Link to="/admin" className="page-back">
        <ArrowLeftIcon width="16" height="16" />Voltar ao Dashboard
      </Link>
      <header className="admin-users-intro">
        <div className="admin-users-intro__heading">
          <div className="admin-users-intro__icon"><UsersIcon width="28" height="28" /></div>
          <div>
            <h1>Gerenciar Usuários</h1>
            <p>Cadastre usuários e controle seus dados, acessos e permissões</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary btn--inline admin-users-create"
          onClick={() => model.setFormUser(null)}
        >
          <PlusIcon width="16" height="16" />Cadastrar usuário
        </button>
      </header>

      {admin.notice && (
        <p className="admin-users-notice" role="status">
          <CheckCircleIcon width="17" height="17" />{admin.notice}
        </p>
      )}
      {admin.error && formUser === undefined && (
        <div className="admin-users-error" role="alert">
          <span>{admin.error}</span>
          <button type="button" onClick={() => void admin.loadUsers()}>Tentar novamente</button>
        </div>
      )}

      <UserStats admin={admin} />

      <section className="admin-users-list">
        <header>
          <div><h2>Usuários cadastrados</h2><p>{admin.users.length} usuários encontrados</p></div>
        </header>
        <UserFilters admin={admin} />
        <UserTable
          admin={admin}
          currentUserId={model.currentUserId}
          setFormUser={model.setFormUser}
          setDeactivatingUser={model.setDeactivatingUser}
        />
      </section>

      {formUser !== undefined && (
        <UserFormDialog
          user={formUser}
          currentUserId={currentUser?.id}
          saving={Boolean(admin.savingId)}
          gatewayError={admin.error}
          onClose={() => model.setFormUser(undefined)}
          onSubmit={model.saveUser}
        />
      )}
      <DeactivateUserDialog
        admin={admin}
        deactivateDialogRef={model.deactivateDialogRef}
        deactivatingUser={model.deactivatingUser}
        setDeactivatingUser={model.setDeactivatingUser}
        confirmDeactivate={model.confirmDeactivate}
      />
    </main>
  );
}
