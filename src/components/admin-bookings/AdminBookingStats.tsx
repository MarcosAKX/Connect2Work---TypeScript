import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  CurrencyIcon,
  DashboardIcon,
  UserIcon,
} from '../icons';
import type { AdminBookingsViewModel } from '../../hooks/useAdminBookingsPage';
import { money } from './formatters';

export function AdminBookingStats({
  data,
  isAdmin,
  isSecretary,
}: Pick<AdminBookingsViewModel, 'data' | 'isAdmin' | 'isSecretary'>) {
  const stats = [
    {
      label: 'Total',
      value: data.stats.total,
      icon: DashboardIcon,
      tone: 'neutral',
      action: undefined,
    },
    {
      label: 'Confirmados',
      value: data.stats.confirmed,
      icon: CheckIcon,
      tone: 'success',
      action: undefined,
    },
    {
      label: 'Pendentes',
      value: data.stats.pending,
      icon: ClockIcon,
      tone: 'pending',
      action: undefined,
    },
    {
      label: 'Cancelados',
      value: data.stats.cancelled,
      icon: CloseIcon,
      tone: 'danger',
      action: undefined,
    },
    {
      label: 'Hoje',
      value: data.stats.today,
      icon: CalendarIcon,
      tone: 'accent',
      action: data.showToday,
    },
    {
      label: 'Check-ins Hoje',
      value: `${data.stats.checkInsToday} de ${data.stats.today}`,
      icon: UserIcon,
      tone: 'success',
      action: undefined,
    },
    ...(isAdmin
      ? [
          {
            label: 'Receita Total',
            value: money.format(data.stats.revenue),
            icon: CurrencyIcon,
            tone: 'success',
            action: undefined,
          } as const,
        ]
      : []),
  ] as const;

  return (
    <section
      className={`admin-bookings-stats${isSecretary ? ' is-secretary' : ''}`}
      aria-label="Resumo dos agendamentos"
      aria-busy={data.isLoading}
    >
      {stats.map(({ label, value, icon: Icon, tone, action }) => {
        const content = (
          <>
            <span>
              <Icon width="19" height="19" />
              {label}
            </span>
            <strong>{data.isLoading ? '—' : value}</strong>
          </>
        );
        return action ? (
          <button
            type="button"
            key={label}
            className={`admin-bookings-stat tone-${tone}`}
            onClick={action}
          >
            {content}
            <small>Aplicar filtro de hoje</small>
          </button>
        ) : (
          <article key={label} className={`admin-bookings-stat tone-${tone}`}>
            {content}
          </article>
        );
      })}
    </section>
  );
}
