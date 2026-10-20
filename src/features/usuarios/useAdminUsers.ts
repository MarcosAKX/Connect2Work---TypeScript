import { useCallback, useEffect, useRef, useState } from 'react';
import { services } from '../../services';
import type { CreateManagedUserInput, UpdateManagedUserInput, UserRole, ManagedUser, ManagedUsersSummary, ManagedUsersQuery } from '../../types/domain';
export type UserStatusFilter = 'all' | 'active' | 'inactive';
export type UserRoleFilter = 'all' | UserRole;
const empty: ManagedUsersSummary = { total: 0, active: 0, inactive: 0, admin: 0, client: 0, secretaria: 0 };
export function useAdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [stats, setStats] = useState(empty); const [total, setTotal] = useState(0);
  const [search, changeSearch] = useState('');
  const [query, setQuery] = useState<ManagedUsersQuery>({ page: 1, pageSize: 50 });
  const [loading, setLoading] = useState(true); const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const generation = useRef(0); const saving = useRef(false);
  const queryRef = useRef(query); queryRef.current = query;
  const loadUsers = useCallback(async () => {
    const own = ++generation.current; setLoading(true); setError('');
    try {
      const page = await services.users.listUsersPage(queryRef.current);
      if (own !== generation.current) return;
      if (!page.items.length && page.page > 1 && page.total <= (page.page - 1) * page.pageSize) { setQuery(current => ({ ...current, page: Math.max(1, Math.ceil(page.total / page.pageSize)) })); return; }
      setUsers(page.items); setStats(page.summary); setTotal(page.total);
    } catch (cause: unknown) { if (own === generation.current) { setUsers([]); setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os usuários.'); } }
    finally { if (own === generation.current) setLoading(false); }
  }, []);
  useEffect(() => { void loadUsers(); return () => { generation.current++; }; }, [loadUsers, query]);
  useEffect(() => {
    if (search === (query.search ?? '')) return;
    const timer = window.setTimeout(() => setQuery(current => ({ ...current, search, page: 1 })), 250);
    return () => window.clearTimeout(timer);
  }, [search, query.search]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 4500); return () => window.clearTimeout(timer); }, [notice]);
  const invalidate = () => { generation.current++; setLoading(true); setUsers([]); setNotice(''); };
  function setSearch(value: string) { if (value === search) return; invalidate(); changeSearch(value); if (value === (query.search ?? '')) setQuery(current => ({ ...current })); }
  function setRoleFilter(role: UserRoleFilter) { invalidate(); setQuery(current => { const { role: _old, ...rest } = current; return { ...rest, page: 1, ...(role === 'all' ? {} : { role }) }; }); }
  function setStatusFilter(status: UserStatusFilter) { invalidate(); setQuery(current => { const { active: _old, ...rest } = current; return { ...rest, page: 1, ...(status === 'all' ? {} : { active: status === 'active' }) }; }); }
  function setPage(page: number) { invalidate(); setQuery(current => ({ ...current, page: Math.max(1, Math.min(10000, page)) })); }
  function clearFilters() { invalidate(); changeSearch(''); setQuery({ page: 1, pageSize: 50 }); }
  async function mutate(id: string, operation: () => Promise<unknown>, message: string): Promise<boolean> {
    if (saving.current) return false; saving.current = true; setSavingId(id); setError(''); setNotice('');
    try { await operation(); await loadUsers(); setNotice(message); return true; }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Não foi possível confirmar a gravação. Atualize a lista.'); return false; }
    finally { saving.current = false; setSavingId(null); }
  }
  const version = (id: string, expected?: string) => expected ?? users.find(user => user.id === id)?.version;
  const createUser = (input: CreateManagedUserInput) => mutate('new', () => services.users.createUser(input), 'Usuário cadastrado com sucesso.');
  const updateUser = (id: string, input: UpdateManagedUserInput, expected?: string) => mutate(id, () => services.users.updateUser(id, input, version(id, expected)), 'Usuário atualizado com sucesso.');
  const updateRole = (id: string, role: UserRole, expected?: string) => mutate(id, () => services.users.updateUserRole(id, role, version(id, expected)), 'Permissão atualizada.');
  const updateStatus = (id: string, active: boolean, expected?: string) => mutate(id, () => services.users.updateUserStatus(id, active, version(id, expected)), active ? 'Usuário ativado.' : 'Usuário desativado.');
  return { users, stats, total, page: query.page, pageSize: query.pageSize, search, setSearch, roleFilter: query.role ?? 'all', setRoleFilter,
    statusFilter: query.active === undefined ? 'all' : query.active ? 'active' : 'inactive', setStatusFilter,
    loading, savingId, error, notice, loadUsers, createUser, updateUser, updateRole, updateStatus, clearFilters, setPage };
}
