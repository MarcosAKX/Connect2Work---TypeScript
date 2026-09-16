import { Link } from 'react-router-dom';
import { CreditCardIcon, ClockIcon, CheckIcon, ArrowRightIcon } from '../icons';
import { getStartTime } from '../../utils/daily-panel';
import type { AdminDailyPanelViewModel } from '../../hooks/useAdminDailyPanel';
export function DailyPanelAttention({
  attentionCount,
  firstPendingPayment,
  firstWaitingArrival,
  openPayment,
  checkIn,
}: Pick<
  AdminDailyPanelViewModel,
  | 'attentionCount'
  | 'firstPendingPayment'
  | 'firstWaitingArrival'
  | 'openPayment'
  | 'checkIn'
>) {
  return (
    <aside
      className="admin-day-attention"
      aria-labelledby="daily-attention-title"
    >
      <header>
        <h2 id="daily-attention-title">Precisa de atenção</h2>
        <span>{attentionCount}</span>
      </header>
      <div>
        {firstPendingPayment && (
          <article>
            <span className="is-warning">
              <CreditCardIcon width="19" height="19" />
            </span>
            <div>
              <strong>Pagamento pendente</strong>
              <small>
                {firstPendingPayment.roomName} ·{' '}
                {firstPendingPayment.clientName}
              </small>
              <small>
                Reserva hoje às{' '}
                {getStartTime(firstPendingPayment.booking.timeSlot)}
              </small>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openPayment(firstPendingPayment)}
            >
              Confirmar pagamento
            </button>
          </article>
        )}
        {firstWaitingArrival && (
          <article>
            <span className="is-danger">
              <ClockIcon width="19" height="19" />
            </span>
            <div>
              <strong>Check-in aguardado</strong>
              <small>
                {firstWaitingArrival.roomName} ·{' '}
                {firstWaitingArrival.clientName}
              </small>
              <small>
                Reserva às {getStartTime(firstWaitingArrival.booking.timeSlot)}
              </small>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void checkIn(firstWaitingArrival)}
            >
              Registrar chegada
            </button>
          </article>
        )}
        {!firstPendingPayment && !firstWaitingArrival && (
          <p className="admin-day-attention__empty">
            <CheckIcon width="19" height="19" />
            Nenhuma pendência operacional agora.
          </p>
        )}
      </div>
      <Link to="/admin/agendamentos">
        Ver todas as pendências ({attentionCount}){' '}
        <ArrowRightIcon width="15" height="15" />
      </Link>
    </aside>
  );
}
