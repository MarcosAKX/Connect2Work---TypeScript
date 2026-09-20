import type { AdminDashboardData } from '../../hooks/useAdminDashboard';
import { Link } from 'react-router-dom';
import { BuildingIcon, DoorIcon, UsersIcon, CalendarIcon, CreditCardIcon } from '../icons';

export function DashboardOverview({ data, isLoading }: { data: AdminDashboardData | null; isLoading: boolean }) {
  const overview = [
    { label: 'Unidades', value: data?.unitCount, icon: BuildingIcon, to: '/admin/unidades', alert: false },
    { label: 'Salas', value: data?.roomCount, icon: DoorIcon, to: '/admin/salas', alert: false },
    { label: 'Usuários ativos', value: data?.activeUserCount, icon: UsersIcon, to: '/admin/usuarios', alert: false },
    { label: 'Reservas hoje', value: data?.todayBookings.length, icon: CalendarIcon, to: '/admin/painel-do-dia', alert: false },
    { label: 'Pagamentos pendentes', value: data?.pendingPaymentCount, icon: CreditCardIcon, to: '/admin/agendamentos', alert: true },
  ] as const;
  return (
    <section className="admin-overview-strip" aria-label="Resumo administrativo" aria-busy={isLoading}>{overview.map(({ label, value, icon: Icon, to, alert }) => <Link to={to} key={label} className={alert && Number(value) > 0 ? 'is-alert' : undefined}>
      <Icon width="29" height="29" /><span>{label}<strong className={isLoading ? 'admin-skeleton admin-skeleton--inline' : ''}>{isLoading ? '' : value}</strong></span>
    </Link>)}</section>
  );
}
