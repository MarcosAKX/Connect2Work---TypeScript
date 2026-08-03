import { useCallback, useEffect, useMemo, useState } from 'react';
import { services } from '../services';
import type { UpdateUserHoursPlanInput, User } from '../types/domain';
import { isHoursPlanExpired } from '../utils/booking';

export type HoursPlanFilter = 'all' | 'with' | 'without' | 'current' | 'expired';

export function useAdminHoursPlan() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<HoursPlanFilter>('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setUsers(await services.users.listUsersWithHoursPlanInfo()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os planos.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 5000); return () => window.clearTimeout(timer); }, [notice]);

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return users.filter((user) => {
      const expired = isHoursPlanExpired(user);
      const matchesText = !term || `${user.name} ${user.email}`.toLocaleLowerCase('pt-BR').includes(term);
      const matchesFilter = filter === 'all' || (filter === 'with' && user.hasHoursPlan) || (filter === 'without' && !user.hasHoursPlan) || (filter === 'current' && user.hasHoursPlan && !expired) || (filter === 'expired' && expired);
      return matchesText && matchesFilter;
    }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [filter, search, users]);

  const stats = useMemo(() => ({
    active: users.filter((user) => user.hasHoursPlan).length,
    current: users.filter((user) => user.hasHoursPlan && !isHoursPlanExpired(user)).length,
    expired: users.filter((user) => isHoursPlanExpired(user)).length,
    availableHours: users.reduce((sum, user) => sum + (user.hasHoursPlan ? user.hoursBalance : 0), 0),
  }), [users]);

  const updatePlan = useCallback(async (userId: string, input: UpdateUserHoursPlanInput) => {
    setSavingId(userId); setError('');
    try {
      const updated = await services.users.updateUserHoursPlan(userId, input);
      setUsers((current) => current.map((user) => user.id === userId ? updated : user));
      setNotice(input.hasHoursPlan ? 'Plano de horas salvo.' : 'Plano de horas desativado.'); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o plano.'); return false; }
    finally { setSavingId(null); }
  }, []);

  const confirmRenewal = useCallback(async (userId: string) => {
    setSavingId(userId); setError('');
    try {
      const updated = await services.users.confirmHoursPlanRenewal(userId);
      setUsers((current) => current.map((user) => user.id === userId ? updated : user));
      setNotice('Renovação confirmada e saldo restaurado.'); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível confirmar a renovação.'); return false; }
    finally { setSavingId(null); }
  }, []);

  return { users: visibleUsers, stats, search, setSearch, filter, setFilter, loading, savingId, error, notice, load, updatePlan, confirmRenewal };
}
