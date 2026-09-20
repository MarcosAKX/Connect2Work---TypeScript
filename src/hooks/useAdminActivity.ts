import { useEffect, useMemo, useState } from 'react';
import { services } from '../services';
import type { AuditLog, User } from '../types/domain';
import { entityLabels } from '../utils/activity-labels';

export function useAdminActivity(user: User | null) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(30);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      services.audit.listRecent(user.id, 500),
      services.users.listUsersWithHoursPlanInfo(),
    ])
      .then(([nextLogs, nextUsers]) => {
        setLogs(nextLogs);
        setClients(nextUsers.filter((candidate) => candidate.role === 'client'));
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Falha ao carregar atividades.'))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => logs.filter((log) =>
    `${log.actorName ?? ''} ${log.entityId} ${entityLabels[log.entity]}`
      .toLowerCase().includes(query.toLowerCase()),
  ), [logs, query]);

  function search(value: string) {
    setQuery(value);
    setLimit(30);
  }
  function clearSearch() { setQuery(''); }
  function loadMore() { setLimit((current) => current + 30); }

  return {
    clients, selectedClient, setSelectedClient, query, limit, error, loading,
    filtered, search, clearSearch, loadMore,
  };
}

export type AdminActivityViewModel = ReturnType<typeof useAdminActivity>;
