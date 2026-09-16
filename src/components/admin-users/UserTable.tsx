import { UsersIcon, UserIcon, PencilIcon } from '../icons';
import type { AdminUsersViewModel } from '../../hooks/useAdminUsersPage';
import type { UserRole } from '../../types/domain';

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador', client: 'Cliente', secretaria: 'Secretaria',
};
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

type UserTableProps = Pick<
  AdminUsersViewModel,
  'admin' | 'currentUserId' | 'setFormUser' | 'setDeactivatingUser'
>;

export function UserTable({
  admin, currentUserId, setFormUser, setDeactivatingUser,
}: UserTableProps) {
  if (admin.loading) {
    return (
      <div className="admin-users-loading" aria-label="Carregando usuários">
        {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
      </div>
    );
  }
  if (admin.users.length === 0) {
    return (
      <div className="admin-users-empty">
        <UsersIcon width="32" height="32" />
        <h3>Nenhum usuário encontrado</h3>
        <p>Ajuste ou limpe os filtros selecionados.</p>
        <button type="button" className="btn btn-primary" onClick={admin.clearFilters}>
          Limpar filtros
        </button>
      </div>
    );
  }
  return (
    <div className="admin-users-table-wrap">
      <table className="admin-users-table">
        <thead>
          <tr><th>Nome</th><th>E-mail</th><th>Permissão</th><th>Status</th><th>Cadastro</th><th>Ações</th></tr>
        </thead>
        <tbody>
          {admin.users.map((user) => {
            const isSelf = user.id === currentUserId;
            const protectionTitle = isSelf
              ? 'Sua própria conta administrativa não pode perder permissão nem ser desativada.'
              : undefined;
            return (
              <tr key={user.id} className={!user.active ? 'is-inactive' : ''}>
                <td data-label="Nome">
                  <strong><UserIcon width="15" height="15" />{user.name}</strong>
                  {isSelf && <small>Você</small>}
                  {(user.profession || user.phone) && (
                    <span className="admin-users-personal">
                      {[user.profession, user.phone].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </td>
                <td data-label="E-mail">{user.email}</td>
                <td data-label="Permissão">
                  <span className={`admin-users-role is-${user.role}`}>{roleLabels[user.role]}</span>
                </td>
                <td data-label="Status">
                  <span className={`admin-users-status ${user.active ? 'is-active' : 'is-inactive'}`}>
                    {user.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td data-label="Cadastro">
                  <time dateTime={user.createdAt}>{dateFormatter.format(new Date(user.createdAt))}</time>
                </td>
                <td data-label="Ações">
                  <div className="admin-users-actions">
                    <button
                      type="button"
                      title={`Editar ${user.name}`}
                      disabled={admin.savingId === user.id}
                      onClick={() => setFormUser(user)}
                    >
                      <PencilIcon width="15" height="15" />Editar
                    </button>
                    <button
                      type="button"
                      className={user.active ? 'is-deactivate' : 'is-activate'}
                      title={protectionTitle ?? (user.active ? `Desativar ${user.name}` : `Ativar ${user.name}`)}
                      disabled={isSelf || admin.savingId === user.id}
                      onClick={() => user.active ? setDeactivatingUser(user) : void admin.updateStatus(user.id, true)}
                    >
                      {user.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
