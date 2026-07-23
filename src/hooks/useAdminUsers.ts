import { useCallback, useEffect, useMemo, useState } from 'react';
import { services } from '../services';
import type { User, UserRole } from '../types/domain';

export type UserStatusFilter = 'all' | 'active' | 'inactive';
export type UserRoleFilter = 'all' | UserRole;

export function useAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await services.users.listUsers());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return users
      .filter((user) => !term || `${user.name} ${user.email}`.toLocaleLowerCase('pt-BR').includes(term))
      .filter((user) => roleFilter === 'all' || user.role === roleFilter)
      .filter((user) => statusFilter === 'all' || user.active === (statusFilter === 'active'))
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  }, [roleFilter, search, statusFilter, users]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.active).length,
    inactive: users.filter((user) => !user.active).length,
    admin: users.filter((user) => user.role === 'admin').length,
    client: users.filter((user) => user.role === 'client').length,
    secretaria: users.filter((user) => user.role === 'secretaria').length,
  }), [users]);

  const updateRole = useCallback(async (id: string, role: UserRole) => {
    setSavingId(id);
    setError('');
    try {
      const updated = await services.users.updateUserRole(id, role);
      setUsers((current) => current.map((user) => user.id === id ? updated : user));
      setNotice('Permissão atualizada.');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a permissão.');
      return false;
    } finally {
      setSavingId(null);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, active: boolean) => {
    setSavingId(id);
    setError('');
    try {
      const updated = await services.users.updateUserStatus(id, active);
      setUsers((current) => current.map((user) => user.id === id ? updated : user));
      setNotice(active ? 'Usuário ativado.' : 'Usuário desativado.');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o acesso.');
      return false;
    } finally {
      setSavingId(null);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
  }, []);

  return {
    users: filteredUsers, stats, search, setSearch, roleFilter, setRoleFilter,
    statusFilter, setStatusFilter, loading, savingId, error, notice,
    loadUsers, updateRole, updateStatus, clearFilters,
  };
}
