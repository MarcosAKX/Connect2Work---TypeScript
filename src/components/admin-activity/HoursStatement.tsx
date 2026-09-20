import { useHoursStatement } from '../../hooks/useHoursStatement';

export function HoursStatement({ userId, actorId }: { userId: string; actorId: string }) {
  const items = useHoursStatement(userId, actorId);
  if (!userId) return <p className="governance-empty">Escolha um cliente para consultar o extrato.</p>;
  if (!items.length) return <p className="governance-empty">Este cliente ainda não possui movimentações.</p>;
  return (
    <div className="activity-list">
      {items.map((item) => (
        <article key={item.id}>
          <span className={`activity-value ${item.hours >= 0 ? 'is-positive' : 'is-negative'}`}>
            {item.hours >= 0 ? '+' : ''}{item.hours}h
          </span>
          <div><strong>{item.reason}</strong><p>Saldo após movimento: {item.balanceAfter}h</p></div>
          <time>{new Date(item.createdAt).toLocaleString('pt-BR')}</time>
        </article>
      ))}
    </div>
  );
}
