import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, PencilIcon, UserIcon, UsersIcon } from '../components/icons';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useAuth } from '../state/AuthContext';
import type { User, UserRole } from '../types/domain';
import '../assets/css/pages/admin-users.css';

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  client: 'Cliente',
  secretaria: 'Secretaria',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const admin = useAdminUsers();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const deactivateDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (editingUser) editDialogRef.current?.showModal();
    else editDialogRef.current?.close();
  }, [editingUser]);
  useEffect(() => {
    if (deactivatingUser) deactivateDialogRef.current?.showModal();
    else deactivateDialogRef.current?.close();
  }, [deactivatingUser]);

  function openEdit(user: User) {
    setSelectedRole(user.role);
    setEditingUser(user);
  }

  async function saveRole() {
    if (!editingUser) return;
    if (await admin.updateRole(editingUser.id, selectedRole)) setEditingUser(null);
  }

  async function confirmDeactivate() {
    if (!deactivatingUser) return;
    if (await admin.updateStatus(deactivatingUser.id, false)) setDeactivatingUser(null);
  }

  return (
    <main className="admin-users-page">
      <Link to="/admin" className="page-back"><ArrowLeftIcon width="16" height="16" />Voltar ao Dashboard</Link>
      <header className="admin-users-intro">
        <div className="admin-users-intro__icon"><UsersIcon width="28" height="28" /></div>
        <div><h1>Gerenciar Usuários</h1><p>Controle acessos e permissões dos usuários do sistema</p></div>
      </header>

      {admin.notice && <p className="admin-users-notice" role="status"><CheckCircleIcon width="17" height="17" />{admin.notice}</p>}
      {admin.error && <div className="admin-users-error" role="alert"><span>{admin.error}</span><button type="button" onClick={() => void admin.loadUsers()}>Tentar novamente</button></div>}

      <section className="admin-users-stats" aria-label="Resumo dos usuários">
        {[
          ['Total', admin.stats.total, 'neutral'],
          ['Ativos', admin.stats.active, 'success'],
          ['Inativos', admin.stats.inactive, 'danger'],
          ['Administradores', admin.stats.admin, 'admin'],
          ['Clientes', admin.stats.client, 'client'],
          ['Secretaria', admin.stats.secretaria, 'secretaria'],
        ].map(([label, value, tone]) => <article key={label} className={`admin-users-stat tone-${tone}`}><span>{label}</span><strong>{value}</strong></article>)}
      </section>

      <section className="admin-users-list">
        <header><div><h2>Usuários cadastrados</h2><p>{admin.users.length} usuários encontrados</p></div></header>
        <div className="admin-users-filters">
          <label className="admin-users-search"><span className="sr-only">Buscar usuário</span><input value={admin.search} onChange={(event) => admin.setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail..." /></label>
          <label><span className="sr-only">Filtrar por permissão</span><select value={admin.roleFilter} onChange={(event) => admin.setRoleFilter(event.target.value as typeof admin.roleFilter)}><option value="all">Todas permissões</option><option value="admin">Administrador</option><option value="client">Cliente</option><option value="secretaria">Secretaria</option></select></label>
          <label><span className="sr-only">Filtrar por status</span><select value={admin.statusFilter} onChange={(event) => admin.setStatusFilter(event.target.value as typeof admin.statusFilter)}><option value="all">Todos status</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label>
        </div>

        {admin.loading ? (
          <div className="admin-users-loading" aria-label="Carregando usuários">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div>
        ) : admin.users.length === 0 ? (
          <div className="admin-users-empty"><UsersIcon width="32" height="32" /><h3>Nenhum usuário encontrado</h3><p>Ajuste ou limpe os filtros selecionados.</p><button type="button" className="btn btn-primary" onClick={admin.clearFilters}>Limpar filtros</button></div>
        ) : (
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Permissão</th><th>Status</th><th>Cadastro</th><th>Ações</th></tr></thead>
              <tbody>{admin.users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                const protectionTitle = isSelf ? 'Sua própria conta administrativa não pode perder permissão nem ser desativada.' : undefined;
                return <tr key={user.id} className={!user.active ? 'is-inactive' : ''}>
                  <td data-label="Nome"><strong><UserIcon width="15" height="15" />{user.name}</strong>{isSelf && <small>Você</small>}</td>
                  <td data-label="E-mail">{user.email}</td>
                  <td data-label="Permissão"><span className={`admin-users-role is-${user.role}`}>{roleLabels[user.role]}</span></td>
                  <td data-label="Status"><span className={`admin-users-status ${user.active ? 'is-active' : 'is-inactive'}`}>{user.active ? 'Ativo' : 'Inativo'}</span></td>
                  <td data-label="Cadastro"><time dateTime={user.createdAt}>{dateFormatter.format(new Date(user.createdAt))}</time></td>
                  <td data-label="Ações"><div className="admin-users-actions">
                    <button type="button" title={protectionTitle ?? `Editar permissão de ${user.name}`} disabled={isSelf || admin.savingId === user.id} onClick={() => openEdit(user)}><PencilIcon width="15" height="15" />Permissão</button>
                    <button type="button" className={user.active ? 'is-deactivate' : 'is-activate'} title={protectionTitle ?? (user.active ? `Desativar ${user.name}` : `Ativar ${user.name}`)} disabled={isSelf || admin.savingId === user.id} onClick={() => user.active ? setDeactivatingUser(user) : void admin.updateStatus(user.id, true)}>{user.active ? 'Desativar' : 'Ativar'}</button>
                  </div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </section>

      <dialog ref={editDialogRef} className="admin-users-modal" aria-labelledby="edit-role-title" onCancel={() => setEditingUser(null)}>
        <div><h2 id="edit-role-title">Editar permissão</h2><p>Defina o nível de acesso de <strong>{editingUser?.name}</strong>.</p><label>Permissão<select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as UserRole)}><option value="client">Cliente</option><option value="secretaria">Secretaria</option><option value="admin">Administrador</option></select></label><footer><button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)} disabled={Boolean(admin.savingId)}>Cancelar</button><button type="button" className="btn btn-primary" onClick={() => void saveRole()} disabled={Boolean(admin.savingId)}>{admin.savingId ? 'Salvando…' : 'Salvar'}</button></footer></div>
      </dialog>

      <dialog ref={deactivateDialogRef} className="admin-users-modal" aria-labelledby="deactivate-user-title" onCancel={() => setDeactivatingUser(null)}>
        <div><h2 id="deactivate-user-title">Desativar usuário?</h2><p><strong>{deactivatingUser?.name}</strong> perderá o acesso ao sistema. A conta poderá ser reativada depois.</p><footer><button type="button" className="btn btn-secondary" onClick={() => setDeactivatingUser(null)} disabled={Boolean(admin.savingId)}>Cancelar</button><button type="button" className="btn admin-users-danger" onClick={() => void confirmDeactivate()} disabled={Boolean(admin.savingId)}>{admin.savingId ? 'Desativando…' : 'Desativar'}</button></footer></div>
      </dialog>
    </main>
  );
}
