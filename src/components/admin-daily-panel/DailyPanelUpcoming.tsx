import { Link } from 'react-router-dom';
import { CalendarIcon, ArrowRightIcon } from '../icons';
import { formatUpcomingDate } from '../../utils/daily-panel';
import type { AdminDailyPanelViewModel } from '../../hooks/useAdminDailyPanel';
export function DailyPanelUpcoming({
  data,
  upcomingDays,
}: Pick<AdminDailyPanelViewModel, 'data' | 'upcomingDays'>) {
  return (
    <aside className="admin-day-upcoming" aria-labelledby="upcoming-title">
      <header>
        <h2 id="upcoming-title">Próximos 7 dias</h2>
      </header>
      <div className="admin-day-upcoming__days">
        {upcomingDays.map(({ key, count }) => (
          <Link key={key} to={`/admin/agendamentos?de=${key}&ate=${key}`}>
            <CalendarIcon width="16" height="16" />
            <span>{formatUpcomingDate(key)}</span>
            <strong>
              {count} {count === 1 ? 'reserva' : 'reservas'}
            </strong>
            <ArrowRightIcon width="14" height="14" />
          </Link>
        ))}
      </div>
      <Link
        className="admin-day-section-footer"
        to={`/admin/agendamentos?de=${data.dayPanel.tomorrowDate}&ate=${data.dayPanel.nextWeekDate}`}
      >
        Ver calendário completo <ArrowRightIcon width="15" height="15" />
      </Link>
    </aside>
  );
}
