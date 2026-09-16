import type { AdminUsersViewModel } from '../../hooks/useAdminUsersPage';

export function UserFilters({ admin }: Pick<AdminUsersViewModel, 'admin'>) {
  return (
    <div className="admin-users-filters">
      <label className="admin-users-search">
        <span className="sr-only">Buscar usuário</span>
        <input
          value={admin.search}
          onChange={(event) => admin.setSearch(event.target.value)}
          placeholder="Buscar por nome ou e-mail..."
        />
      </label>
      <label>
        <span className="sr-only">Filtrar por permissão</span>
        <select
          value={admin.roleFilter}
          onChange={(event) => admin.setRoleFilter(
            event.target.value === 'admin' || event.target.value === 'client' || event.target.value === 'secretaria'
              ? event.target.value : 'all',
          )}
        >
          <option value="all">Todas permissões</option>
          <option value="admin">Administrador</option>
          <option value="client">Cliente</option>
          <option value="secretaria">Secretaria</option>
        </select>
      </label>
      <label>
        <span className="sr-only">Filtrar por status</span>
        <select
          value={admin.statusFilter}
          onChange={(event) => admin.setStatusFilter(
            event.target.value === 'active' || event.target.value === 'inactive'
              ? event.target.value : 'all',
          )}
        >
          <option value="all">Todos status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </label>
    </div>
  );
}
