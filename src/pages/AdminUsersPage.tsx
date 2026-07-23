import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, PencilIcon, PlusIcon, UserIcon, UsersIcon } from '../components/icons';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useAuth } from '../state/AuthContext';
import type { CreateManagedUserInput, UpdateManagedUserInput, User, UserRole } from '../types/domain';
import '../assets/css/pages/admin-users.css';

const roleLabels: Record<UserRole, string> = { admin: 'Administrador', client: 'Cliente', secretaria: 'Secretaria' };
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

interface UserFormValue {
  name: string;
  email: string;
  profession: string;
  phone: string;
  password: string;
  role: UserRole;
  active: boolean;
}

function UserFormDialog({ user, currentUserId, saving, gatewayError, onClose, onSubmit }: {
  user: User | null;
  currentUserId?: string;
  saving: boolean;
  gatewayError: string;
  onClose(): void;
  onSubmit(value: UserFormValue): Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const isEditing = Boolean(user);
  const isSelf = user?.id === currentUserId;
  const [value, setValue] = useState<UserFormValue>(() => ({
    name: user?.name ?? '', email: user?.email ?? '', profession: user?.profession ?? '',
    phone: user?.phone ?? '', password: '', role: user?.role ?? 'client', active: user?.active ?? true,
  }));
  const [validationError, setValidationError] = useState('');

  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);

  function change<K extends keyof UserFormValue>(key: K, next: UserFormValue[K]) {
    setValue((current) => ({ ...current, [key]: next }));
    setValidationError('');
  }

  function submit() {
    if (value.name.trim().length < 2) { setValidationError('Informe um nome válido.'); return; }
    if (!value.email.includes('@')) { setValidationError('Informe um e-mail válido.'); return; }
    if (!isEditing && value.password.length < 6) { setValidationError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (isEditing && value.password && value.password.length < 6) { setValidationError('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    void onSubmit(value);
  }

  return <dialog ref={ref} className="admin-users-modal admin-users-modal--form" aria-labelledby="user-form-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}>
    <div><header><div><h2 id="user-form-title">{isEditing ? 'Editar usuário' : 'Cadastrar usuário'}</h2><p>{isEditing ? 'Atualize os dados pessoais e de acesso.' : 'Crie uma nova conta e defina seu nível de acesso.'}</p></div></header>
      <div className="admin-users-form">
        <label>Nome completo<input value={value.name} onChange={(event) => change('name', event.target.value)} maxLength={100} autoComplete="name" autoFocus /></label>
        <label>E-mail<input type="email" value={value.email} onChange={(event) => change('email', event.target.value)} maxLength={254} autoComplete="email" /></label>
        <div className="admin-users-form__grid">
          <label>Profissão <span>(opcional)</span><input value={value.profession} onChange={(event) => change('profession', event.target.value)} maxLength={80} /></label>
          <label>Telefone <span>(opcional)</span><input value={value.phone} onChange={(event) => change('phone', event.target.value)} maxLength={30} autoComplete="tel" /></label>
        </div>
        <label>{isEditing ? 'Nova senha' : 'Senha'} <span>{isEditing ? '(deixe vazio para manter a atual)' : '(mínimo de 6 caracteres)'}</span><input type="password" value={value.password} onChange={(event) => change('password', event.target.value)} minLength={6} maxLength={128} autoComplete="new-password" /></label>
        <div className="admin-users-form__grid">
          <label>Permissão<select value={value.role} onChange={(event) => change('role', event.target.value as UserRole)} disabled={isSelf}><option value="client">Cliente</option><option value="secretaria">Secretaria</option><option value="admin">Administrador</option></select></label>
          <label>Status<select value={value.active ? 'active' : 'inactive'} onChange={(event) => change('active', event.target.value === 'active')} disabled={isSelf}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label>
        </div>
        {isSelf && <p className="admin-users-form__hint">Sua própria permissão administrativa e seu acesso permanecem protegidos.</p>}
        {(validationError || gatewayError) && <p className="admin-users-form__error" role="alert">{validationError || gatewayError}</p>}
      </div>
      <footer><button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar usuário'}</button></footer>
    </div>
  </dialog>;
}

export function AdminUsersPage() {
  const { user: currentUser, refreshUser } = useAuth();
  const admin = useAdminUsers();
  const [formUser, setFormUser] = useState<User | null | undefined>(undefined);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const deactivateDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (deactivatingUser) deactivateDialogRef.current?.showModal();
    else deactivateDialogRef.current?.close();
  }, [deactivatingUser]);

  async function saveUser(value: UserFormValue) {
    if (formUser) {
      const input: UpdateManagedUserInput = { ...value, password: value.password || undefined };
      if (await admin.updateUser(formUser.id, input)) {
        if (formUser.id === currentUser?.id) refreshUser();
        setFormUser(undefined);
      }
      return;
    }
    const input: CreateManagedUserInput = value;
    if (await admin.createUser(input)) setFormUser(undefined);
  }

  async function confirmDeactivate() {
    if (deactivatingUser && await admin.updateStatus(deactivatingUser.id, false)) setDeactivatingUser(null);
  }

  return <main className="admin-users-page">
    <Link to="/admin" className="page-back"><ArrowLeftIcon width="16" height="16" />Voltar ao Dashboard</Link>
    <header className="admin-users-intro"><div className="admin-users-intro__heading"><div className="admin-users-intro__icon"><UsersIcon width="28" height="28" /></div><div><h1>Gerenciar Usuários</h1><p>Cadastre usuários e controle seus dados, acessos e permissões</p></div></div><button type="button" className="btn btn-primary btn--inline admin-users-create" onClick={() => setFormUser(null)}><PlusIcon width="16" height="16" />Cadastrar usuário</button></header>

    {admin.notice && <p className="admin-users-notice" role="status"><CheckCircleIcon width="17" height="17" />{admin.notice}</p>}
    {admin.error && formUser === undefined && <div className="admin-users-error" role="alert"><span>{admin.error}</span><button type="button" onClick={() => void admin.loadUsers()}>Tentar novamente</button></div>}

    <section className="admin-users-stats" aria-label="Resumo dos usuários">{[
      ['Total', admin.stats.total, 'neutral'], ['Ativos', admin.stats.active, 'success'], ['Inativos', admin.stats.inactive, 'danger'],
      ['Administradores', admin.stats.admin, 'admin'], ['Clientes', admin.stats.client, 'client'], ['Secretaria', admin.stats.secretaria, 'secretaria'],
    ].map(([label, value, tone]) => <article key={label} className={`admin-users-stat tone-${tone}`}><span>{label}</span><strong>{value}</strong></article>)}</section>

    <section className="admin-users-list"><header><div><h2>Usuários cadastrados</h2><p>{admin.users.length} usuários encontrados</p></div></header>
      <div className="admin-users-filters"><label className="admin-users-search"><span className="sr-only">Buscar usuário</span><input value={admin.search} onChange={(event) => admin.setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail..." /></label><label><span className="sr-only">Filtrar por permissão</span><select value={admin.roleFilter} onChange={(event) => admin.setRoleFilter(event.target.value as typeof admin.roleFilter)}><option value="all">Todas permissões</option><option value="admin">Administrador</option><option value="client">Cliente</option><option value="secretaria">Secretaria</option></select></label><label><span className="sr-only">Filtrar por status</span><select value={admin.statusFilter} onChange={(event) => admin.setStatusFilter(event.target.value as typeof admin.statusFilter)}><option value="all">Todos status</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label></div>
      {admin.loading ? <div className="admin-users-loading" aria-label="Carregando usuários">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div> : admin.users.length === 0 ? <div className="admin-users-empty"><UsersIcon width="32" height="32" /><h3>Nenhum usuário encontrado</h3><p>Ajuste ou limpe os filtros selecionados.</p><button type="button" className="btn btn-primary" onClick={admin.clearFilters}>Limpar filtros</button></div> : <div className="admin-users-table-wrap"><table className="admin-users-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Permissão</th><th>Status</th><th>Cadastro</th><th>Ações</th></tr></thead><tbody>{admin.users.map((user) => {
        const isSelf = user.id === currentUser?.id;
        const protectionTitle = isSelf ? 'Sua própria conta administrativa não pode perder permissão nem ser desativada.' : undefined;
        return <tr key={user.id} className={!user.active ? 'is-inactive' : ''}><td data-label="Nome"><strong><UserIcon width="15" height="15" />{user.name}</strong>{isSelf && <small>Você</small>}{(user.profession || user.phone) && <span className="admin-users-personal">{[user.profession, user.phone].filter(Boolean).join(' · ')}</span>}</td><td data-label="E-mail">{user.email}</td><td data-label="Permissão"><span className={`admin-users-role is-${user.role}`}>{roleLabels[user.role]}</span></td><td data-label="Status"><span className={`admin-users-status ${user.active ? 'is-active' : 'is-inactive'}`}>{user.active ? 'Ativo' : 'Inativo'}</span></td><td data-label="Cadastro"><time dateTime={user.createdAt}>{dateFormatter.format(new Date(user.createdAt))}</time></td><td data-label="Ações"><div className="admin-users-actions"><button type="button" title={`Editar ${user.name}`} disabled={admin.savingId === user.id} onClick={() => setFormUser(user)}><PencilIcon width="15" height="15" />Editar</button><button type="button" className={user.active ? 'is-deactivate' : 'is-activate'} title={protectionTitle ?? (user.active ? `Desativar ${user.name}` : `Ativar ${user.name}`)} disabled={isSelf || admin.savingId === user.id} onClick={() => user.active ? setDeactivatingUser(user) : void admin.updateStatus(user.id, true)}>{user.active ? 'Desativar' : 'Ativar'}</button></div></td></tr>;
      })}</tbody></table></div>}
    </section>

    {formUser !== undefined && <UserFormDialog user={formUser} currentUserId={currentUser?.id} saving={Boolean(admin.savingId)} gatewayError={admin.error} onClose={() => setFormUser(undefined)} onSubmit={saveUser} />}
    <dialog ref={deactivateDialogRef} className="admin-users-modal" aria-labelledby="deactivate-user-title" onCancel={() => setDeactivatingUser(null)}><div><h2 id="deactivate-user-title">Desativar usuário?</h2><p><strong>{deactivatingUser?.name}</strong> perderá o acesso ao sistema. A conta poderá ser reativada depois.</p><footer><button type="button" className="btn btn-secondary" onClick={() => setDeactivatingUser(null)} disabled={Boolean(admin.savingId)}>Cancelar</button><button type="button" className="btn admin-users-danger" onClick={() => void confirmDeactivate()} disabled={Boolean(admin.savingId)}>{admin.savingId ? 'Desativando…' : 'Desativar'}</button></footer></div></dialog>
  </main>;
}
