import { DoorIcon, CreditCardIcon, UserIcon, ClockIcon } from '../icons';
import { getStartTime } from '../../utils/daily-panel';
import type { AdminDailyPanelViewModel } from '../../hooks/useAdminDailyPanel';
export function DailyPanelMetrics({
  data,
}: Pick<AdminDailyPanelViewModel, 'data'>) {
  return (
    <section
      className="admin-day-metrics"
      aria-label="Resumo operacional de hoje"
      aria-busy={data.isLoading}
    >
      <article>
        <DoorIcon width="29" height="29" />
        <div>
          <strong>{data.dayPanel.presentNow.length}</strong>
          <p>salas ocupadas</p>
        </div>
      </article>
      <article>
        <CreditCardIcon width="29" height="29" />
        <div>
          <strong>{data.dayPanel.pendingPayments.length}</strong>
          <p>
            {data.dayPanel.pendingPayments.length === 1
              ? 'pagamento pendente'
              : 'pagamentos pendentes'}
          </p>
        </div>
      </article>
      <article>
        <UserIcon className="is-info" width="29" height="29" />
        <div>
          <strong>
            {data.stats.checkInsToday} <small>de {data.stats.today}</small>
          </strong>
          <p>check-ins</p>
        </div>
      </article>
      <article>
        <ClockIcon width="29" height="29" />
        <div>
          <p>Próxima chegada</p>
          <strong>
            {data.dayPanel.nextArrival
              ? getStartTime(data.dayPanel.nextArrival.booking.timeSlot)
              : '—'}
          </strong>
        </div>
      </article>
    </section>
  );
}
