import { useEffect, useMemo, useState } from 'react';
import { BackLink } from '../components/BackLink';
import { services } from '../services';
import { useAuth } from '../state/AuthContext';
import type { AuditAction, AuditLog, User } from '../types/domain';
import '../assets/css/pages/admin-governance.css';

const actionLabels: Record<AuditAction, string> = { create: 'Criou', update: 'Atualizou', delete: 'Excluiu', cancel: 'Cancelou', confirm: 'Confirmou', check_in: 'Fez check-in', renew: 'Renovou', import: 'Restaurou' };
const entityLabels = { user: 'usuário', unit: 'unidade', room: 'sala', business_service: 'serviço', booking: 'agendamento', task: 'tarefa', hours_plan: 'plano de horas', backup: 'backup' };

export function AdminActivityPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(30);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([services.audit.listRecent(user.id, 500), services.users.listUsersWithHoursPlanInfo()])
      .then(([nextLogs, nextUsers]) => { setLogs(nextLogs); setClients(nextUsers.filter((candidate) => candidate.role === 'client')); })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Falha ao carregar atividades.'))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => logs.filter((log) => `${log.actorName ?? ''} ${log.entityId} ${entityLabels[log.entity]}`.toLowerCase().includes(query.toLowerCase())), [logs, query]);

  return <main className="governance-page">
    <BackLink to="/admin" label="Voltar ao Dashboard" />
    <header className="governance-heading"><div><span>Rastreabilidade</span><h1>Atividades e extratos</h1><p>Acompanhe alterações administrativas e o consumo dos planos de horas.</p></div></header>
    {error && <div className="governance-notice is-error" role="alert">{error}</div>}
    <section className="governance-card governance-card--wide"><div className="governance-toolbar"><div><h2>Atividades recentes</h2><p>{loading ? 'Carregando registros…' : `${filtered.length} registros encontrados`}</p></div><label><span>Buscar atividades</span><input type="search" placeholder="Pessoa, item ou ID" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(30); }} /></label></div>
      {loading ? <div className="governance-skeleton" aria-label="Carregando atividades">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div> : <div className="activity-list">{filtered.slice(0, limit).map((log) => <article key={log.id}><span className="activity-dot" /><div><strong>{actionLabels[log.action]} {entityLabels[log.entity]}</strong><p>{log.actorName ?? 'Sistema'} · <code title={log.entityId}>{log.entityId}</code></p></div><time dateTime={log.occurredAt}>{new Date(log.occurredAt).toLocaleString('pt-BR')}</time></article>)}{!filtered.length && <div className="governance-empty"><strong>Nenhuma atividade encontrada</strong><p>Tente outro nome, item ou identificador.</p>{query && <button type="button" className="governance-secondary" onClick={() => setQuery('')}>Limpar busca</button>}</div>}</div>}
      {limit < filtered.length && <button className="governance-secondary" type="button" onClick={() => setLimit((current) => current + 30)}>Carregar mais</button>}
    </section>
    <section className="governance-card governance-card--wide"><div className="governance-toolbar"><div><h2>Extrato do plano de horas</h2><p>Créditos, consumos, estornos e ajustes.</p></div><label><span>Cliente</span><select value={selectedClient} onChange={(event) => setSelectedClient(event.target.value)}><option value="">Selecione o cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label></div>
      <HoursStatement userId={selectedClient} actorId={user?.id ?? ''} />
    </section>
  </main>;
}

function HoursStatement({ userId, actorId }: { userId: string; actorId: string }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof services.audit.listHoursPlanTransactions>>>([]);
  useEffect(() => { if (!userId || !actorId) { setItems([]); return; } void services.audit.listHoursPlanTransactions(userId, actorId).then(setItems); }, [actorId, userId]);
  if (!userId) return <p className="governance-empty">Escolha um cliente para consultar o extrato.</p>;
  if (!items.length) return <p className="governance-empty">Este cliente ainda não possui movimentações.</p>;
  return <div className="activity-list">{items.map((item) => <article key={item.id}><span className={`activity-value ${item.hours >= 0 ? 'is-positive' : 'is-negative'}`}>{item.hours >= 0 ? '+' : ''}{item.hours}h</span><div><strong>{item.reason}</strong><p>Saldo após movimento: {item.balanceAfter}h</p></div><time>{new Date(item.createdAt).toLocaleString('pt-BR')}</time></article>)}</div>;
}
