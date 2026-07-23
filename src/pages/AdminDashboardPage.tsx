import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import '../assets/css/pages/admin-dashboard.css';
import { useAuth } from '../state/AuthContext';
import { useAdminDashboard, type AdminBookingItem, type AdminDashboardData } from '../hooks/useAdminDashboard';
import {
  ArrowRightIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CurrencyIcon,
  DoorIcon,
  TrendUpIcon,
  UsersIcon,
} from '../components/icons';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`));
}

function BookingList({ bookings, emptyMessage, showDate = false }: { bookings: AdminBookingItem[]; emptyMessage: string; showDate?: boolean }) {
  if (bookings.length === 0) return <p className="admin-schedule__empty">{emptyMessage}</p>;
  return <ul className="admin-booking-list">{bookings.slice(0, 4).map((booking) => <li key={booking.id}>
    <div><strong>{booking.roomName}</strong><span className="admin-booking-list__customer">Agendado por {booking.userName}</span><span>{booking.unitName}</span></div>
    <time dateTime={`${booking.date}T${booking.timeSlot.slice(0, 5)}`}>{showDate && <span>{formatDate(booking.date)}</span>}{booking.timeSlot}</time>
  </li>)}</ul>;
}

function getMonthEnd(key: string) {
  const [yearValue, monthValue] = key.split('-');
  const year = Number(yearValue);
  const month = Number(monthValue);
  return `${key}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
}

function MonthlyBookingsChart({ months, units }: { months: AdminDashboardData['monthlyBookings']; units: AdminDashboardData['chartUnits'] }) {
  const [range, setRange] = useState<6 | 12>(6);
  const [unitId, setUnitId] = useState('');
  const [showActive, setShowActive] = useState(true);
  const [showCancelled, setShowCancelled] = useState(true);
  const visibleMonths = useMemo(() => months.slice(-range).map((month) => {
    const values = unitId ? month.byUnit[unitId] ?? { active: 0, cancelled: 0 } : month;
    return { ...month, active: values.active, cancelled: values.cancelled };
  }), [months, range, unitId]);
  const maximum = Math.max(1, ...visibleMonths.map(({ active, cancelled }) => Math.max(showActive ? active : 0, showCancelled ? cancelled : 0)));
  const selectedUnitName = units.find(({ id }) => id === unitId)?.name;

  return <section className="admin-monthly-chart" aria-labelledby="monthly-bookings-title">
    <header><div><h2 id="monthly-bookings-title"><TrendUpIcon width="20" height="20" />Reservas por mês</h2><p>Explore o volume agendado e clique em um mês para abrir os registros</p></div><div className="admin-chart-controls"><label><span className="sr-only">Filtrar gráfico por unidade</span><select value={unitId} onChange={(event) => setUnitId(event.target.value)}><option value="">Todas as unidades</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><div className="admin-chart-range" aria-label="Período do gráfico"><button type="button" className={range === 6 ? 'is-active' : ''} onClick={() => setRange(6)}>6 meses</button><button type="button" className={range === 12 ? 'is-active' : ''} onClick={() => setRange(12)}>12 meses</button></div></div></header>
    <div className="admin-chart-legend" aria-label="Séries exibidas"><button type="button" className={`is-active${showActive ? ' is-visible' : ''}`} aria-pressed={showActive} onClick={() => { if (showCancelled || !showActive) setShowActive((value) => !value); }}>Ativas</button><button type="button" className={`is-cancelled${showCancelled ? ' is-visible' : ''}`} aria-pressed={showCancelled} onClick={() => { if (showActive || !showCancelled) setShowCancelled((value) => !value); }}>Canceladas</button></div>
    <div className={`admin-chart-plot range-${range}${showActive ? ' show-active' : ''}${showCancelled ? ' show-cancelled' : ''}`} role="group" aria-label={`Gráfico de reservas por mês${selectedUnitName ? ` na unidade ${selectedUnitName}` : ''}`}>
      {visibleMonths.map((month) => {
        const query = new URLSearchParams({ de: `${month.key}-01`, ate: getMonthEnd(month.key) });
        if (unitId) query.set('unidade', unitId);
        return <Link className="admin-chart-column" to={`/admin/agendamentos?${query.toString()}`} key={month.key} aria-label={`${month.label}: ${month.active} ativas e ${month.cancelled} canceladas. Abrir agendamentos.`}>
        <strong>{(showActive ? month.active : 0) + (showCancelled ? month.cancelled : 0)}</strong>
        <div className="admin-chart-track"><span className="is-active" style={{ height: `${(month.active / maximum) * 100}%` }} /><span className="is-cancelled" style={{ height: `${(month.cancelled / maximum) * 100}%` }} /></div>
        <small>{month.label}</small>
        <span className="admin-chart-tooltip" role="tooltip"><strong>{month.label}{selectedUnitName ? ` · ${selectedUnitName}` : ''}</strong><span><i className="is-active" />{month.active} ativas</span><span><i className="is-cancelled" />{month.cancelled} canceladas</span><em>Clique para detalhar</em></span>
      </Link>;
      })}
    </div>
  </section>;
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useAdminDashboard();
  const stats = [
    { label: 'Unidades', value: data?.unitCount, detail: 'Espaços cadastrados', icon: BuildingIcon, tone: 'info', to: '/admin/unidades' },
    { label: 'Salas', value: data?.roomCount, detail: 'Salas cadastradas', icon: DoorIcon, tone: 'success', to: '/admin/salas' },
    { label: 'Agendamentos', value: data?.bookingCount, detail: `${data?.upcomingCount ?? 0} futuros`, icon: CalendarIcon, tone: 'accent', to: '/admin/agendamentos' },
    { label: 'Usuários ativos', value: data?.activeUserCount, detail: 'Contas com acesso', icon: UsersIcon, tone: 'info', to: '/admin/usuarios' },
  ] as const;

  return <main className="admin-dashboard">
    <header className="admin-dashboard__intro"><h1>Dashboard</h1><p>Bem-vindo ao painel administrativo, {user?.name ?? 'Administrador'}</p></header>
    {error && <div className="admin-dashboard__error" role="alert"><span>{error}</span><button type="button" onClick={() => void reload()}>Tentar novamente</button></div>}

    <section className="admin-stats" aria-label="Resumo administrativo" aria-busy={isLoading}>{stats.map(({ label, value, detail, icon: Icon, tone, to }) => <Link className="admin-stat admin-stat--link" to={to} key={label}>
      <div className="admin-stat__top"><span>{label}</span><Icon className={`admin-tone--${tone}`} width="20" height="20" /></div>
      <strong className={isLoading ? 'admin-skeleton admin-skeleton--value' : ''}>{isLoading ? '' : value}</strong><p>{detail}</p><span className="admin-stat__link-label">Gerenciar <ArrowRightIcon width="14" height="14" /></span>
    </Link>)}</section>

    <section className="admin-operational-summary" aria-label="Situação operacional">
      <Link to="/admin/painel-do-dia"><DoorIcon className="admin-tone--info" width="19" height="19" /><span><strong>{data?.occupiedRoomCount ?? 0}</strong> salas ocupadas agora</span><ArrowRightIcon width="15" height="15" /></Link>
      <Link to="/admin/agendamentos"><ClockIcon className="admin-tone--accent" width="19" height="19" /><span><strong>{data?.pendingPaymentCount ?? 0}</strong> pagamentos pendentes</span><ArrowRightIcon width="15" height="15" /></Link>
      <Link to="/admin/painel-do-dia"><CheckIcon className="admin-tone--success" width="19" height="19" /><span><strong>{data?.checkInsToday ?? 0}</strong> check-ins hoje</span><ArrowRightIcon width="15" height="15" /></Link>
      <div><CurrencyIcon width="19" height="19" /><span><strong>Receita indisponível</strong> aguardando integração financeira</span></div>
    </section>

    <section className="admin-schedules" aria-label="Agenda administrativa">
      <article className="admin-schedule"><header className="admin-schedule__header"><div><h2><ClockIcon width="20" height="20" />Agendamentos de Hoje</h2><p>{data?.todayBookings.length ?? 0} agendamentos para hoje</p></div><Link to="/admin/painel-do-dia">Ver operação do dia <ArrowRightIcon width="16" height="16" /></Link></header>{isLoading ? <div className="admin-skeleton admin-skeleton--panel" aria-label="Carregando agendamentos de hoje" /> : <BookingList bookings={data?.todayBookings ?? []} emptyMessage="Nenhum agendamento para hoje" />}</article>
      <article className="admin-schedule"><header className="admin-schedule__header"><div><h2><TrendUpIcon width="20" height="20" />Próximos Agendamentos</h2><p>Agendamentos dos próximos 7 dias</p></div><Link to="/admin/agendamentos">Ver todos <ArrowRightIcon width="16" height="16" /></Link></header>{isLoading ? <div className="admin-skeleton admin-skeleton--panel" aria-label="Carregando próximos agendamentos" /> : <BookingList bookings={data?.nextBookings ?? []} emptyMessage="Nenhum agendamento nos próximos dias" showDate />}</article>
    </section>

    {!isLoading && data && <MonthlyBookingsChart months={data.monthlyBookings} units={data.chartUnits} />}

    <section className="admin-quick-actions" aria-labelledby="admin-actions-title"><div><h2 id="admin-actions-title">Ações Rápidas</h2><p>Acesse as operações mais usadas</p></div><div className="admin-quick-actions__links">
      <Link to="/admin/painel-do-dia" className="btn btn-primary"><ClockIcon width="17" height="17" />Abrir Painel do Dia</Link>
      <Link to="/admin/agendamentos" className="btn btn-secondary"><CalendarIcon width="17" height="17" />Ver Agendamentos</Link>
      <Link to="/admin/usuarios" className="btn btn-secondary"><UsersIcon width="17" height="17" />Gerenciar Usuários</Link>
    </div></section>
  </main>;
}
