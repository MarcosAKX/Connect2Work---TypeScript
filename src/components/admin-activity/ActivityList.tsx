import type { AdminActivityViewModel } from '../../hooks/useAdminActivity';
import { actionLabels, entityLabels } from '../../utils/activity-labels';

type ActivityListProps = Pick<AdminActivityViewModel, 'loading' | 'filtered' | 'limit' | 'query' | 'clearSearch'>;

export function ActivityList({ loading, filtered, limit, query, clearSearch }: ActivityListProps) {
  if (loading) return (
    <div className="governance-skeleton" aria-label="Carregando atividades">
      {Array.from({ length: 5 }, (_, index) => <span key={index} />)}
    </div>
  );
  return (
    <div className="activity-list">
      {filtered.slice(0, limit).map((log) => (
        <article key={log.id}>
          <span className="activity-dot" />
          <div>
            <strong>{actionLabels[log.action]} {entityLabels[log.entity]}</strong>
            <p>{log.actorName ?? 'Sistema'} · <code title={log.entityId}>{log.entityId}</code></p>
          </div>
          <time dateTime={log.occurredAt}>{new Date(log.occurredAt).toLocaleString('pt-BR')}</time>
        </article>
      ))}
      {!filtered.length && (
        <div className="governance-empty">
          <strong>Nenhuma atividade encontrada</strong>
          <p>Tente outro nome, item ou identificador.</p>
          {query && <button type="button" className="governance-secondary" onClick={clearSearch}>Limpar busca</button>}
        </div>
      )}
    </div>
  );
}
