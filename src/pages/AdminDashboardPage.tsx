import { Link } from 'react-router-dom';
import '../assets/css/pages/admin-dashboard.css';
import { useAuth } from '../state/AuthContext';
import { useAdminDashboard, type AdminBookingItem } from '../hooks/useAdminDashboard';
import {
  ArrowRightIcon,
  BuildingIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyIcon,
  DoorIcon,
  TrendUpIcon,
} from '../components/icons';

function BookingList({ bookings, emptyMessage }: { bookings: AdminBookingItem[]; emptyMessage: string }) {
  if (bookings.length === 0) {
    return <p className="admin-schedule__empty">{emptyMessage}</p>;
  }

  return (
    <ul className="admin-booking-list">
      {bookings.slice(0, 4).map((booking) => (
        <li key={booking.id}>
          <div>
            <strong>{booking.roomName}</strong>
            <span className="admin-booking-list__customer">Agendado por {booking.userName}</span>
            <span>{booking.unitName}</span>
          </div>
          <time dateTime={`${booking.date}T${booking.timeSlot.slice(0, 5)}`}>{booking.timeSlot}</time>
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useAdminDashboard();
  const name = user?.name ?? 'Administrador';

  const stats = [
    { label: 'Unidades', value: data?.unitCount, detail: 'Espaços cadastrados', icon: BuildingIcon, tone: 'info' },
    { label: 'Salas', value: data?.roomCount, detail: 'Salas disponíveis', icon: DoorIcon, tone: 'success' },
    { label: 'Agendamentos', value: data?.bookingCount, detail: `${data?.upcomingCount ?? 0} futuros`, icon: CalendarIcon, tone: 'accent' },
  ] as const;

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard__intro">
        <h1>Dashboard</h1>
        <p>Bem-vindo ao painel administrativo, {name}</p>
      </header>

      {error && (
        <div className="admin-dashboard__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void reload()}>Tentar novamente</button>
        </div>
      )}

      <section className="admin-stats" aria-label="Resumo administrativo" aria-busy={isLoading}>
        {stats.map(({ label, value, detail, icon: Icon, tone }) => (
          <article className="admin-stat" key={label}>
            <div className="admin-stat__top"><span>{label}</span><Icon className={`admin-tone--${tone}`} width="20" height="20" /></div>
            <strong className={isLoading ? 'admin-skeleton admin-skeleton--value' : ''}>{isLoading ? '' : value}</strong>
            <p>{detail}</p>
          </article>
        ))}
        <article className="admin-stat">
          <div className="admin-stat__top"><span>Receita Total</span><CurrencyIcon className="admin-tone--success" width="20" height="20" /></div>
          <strong className="admin-stat__unavailable">Indisponível</strong>
          <p>Aguardando dados financeiros</p>
        </article>
      </section>

      <section className="admin-schedules" aria-label="Agenda administrativa">
        <article className="admin-schedule">
          <header className="admin-schedule__header">
            <div><h2><ClockIcon width="20" height="20" />Agendamentos de Hoje</h2><p>{data?.todayBookings.length ?? 0} agendamentos para hoje</p></div>
            <Link to="/admin/agendamentos">Ver todos <ArrowRightIcon width="16" height="16" /></Link>
          </header>
          {isLoading ? <div className="admin-skeleton admin-skeleton--panel" aria-label="Carregando agendamentos de hoje" /> : <BookingList bookings={data?.todayBookings ?? []} emptyMessage="Nenhum agendamento para hoje" />}
        </article>

        <article className="admin-schedule">
          <header className="admin-schedule__header">
            <div><h2><TrendUpIcon width="20" height="20" />Próximos Agendamentos</h2><p>Agendamentos dos próximos 7 dias</p></div>
          </header>
          {isLoading ? <div className="admin-skeleton admin-skeleton--panel" aria-label="Carregando próximos agendamentos" /> : <BookingList bookings={data?.nextBookings ?? []} emptyMessage="Nenhum agendamento nos próximos dias" />}
        </article>
      </section>

      <section className="admin-quick-actions" aria-labelledby="admin-actions-title">
        <div><h2 id="admin-actions-title">Ações Rápidas</h2><p>Gerencie seu coworking</p></div>
        <div className="admin-quick-actions__links">
          <Link to="/admin/unidades" className="btn btn-primary"><BuildingIcon width="17" height="17" />Gerenciar Unidades</Link>
          <Link to="/admin/salas" className="btn btn-secondary"><DoorIcon width="17" height="17" />Gerenciar Salas</Link>
          <Link to="/admin/agendamentos" className="btn btn-secondary"><CalendarIcon width="17" height="17" />Ver Agendamentos</Link>
        </div>
      </section>
    </main>
  );
}
