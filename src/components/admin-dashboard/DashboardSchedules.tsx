import type { AdminDashboardData } from '../../hooks/useAdminDashboard';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '../icons';
import { BookingList } from './BookingList';

export function DashboardSchedules({ data, isLoading }: { data: AdminDashboardData | null; isLoading: boolean }) {
  return (
    <section className="admin-schedules" aria-label="Agenda administrativa">
      <article className="admin-schedule">
        <header className="admin-schedule__header"><h2>Agenda de hoje</h2></header>
        {isLoading ? (
          <div className="admin-skeleton admin-skeleton--panel" />
        ) : (
          <BookingList bookings={data?.todayBookings ?? []} emptyMessage="Nenhum agendamento para hoje" />
        )}
        <Link className="admin-schedule__footer" to="/admin/painel-do-dia">
          Ver agenda completa <ArrowRightIcon width="15" height="15" />
        </Link>
      </article>
      <article className="admin-schedule">
        <header className="admin-schedule__header"><h2>Próximos agendamentos</h2></header>
        {isLoading ? (
          <div className="admin-skeleton admin-skeleton--panel" />
        ) : (
          <BookingList bookings={data?.nextBookings ?? []} emptyMessage="Nenhum agendamento nos próximos dias" showDate />
        )}
        <Link className="admin-schedule__footer" to="/admin/agendamentos">
          Ver todos os agendamentos <ArrowRightIcon width="15" height="15" />
        </Link>
      </article>
    </section>
  );
}
