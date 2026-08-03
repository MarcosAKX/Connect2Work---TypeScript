import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../assets/css/pages/admin-dashboard.css';
import { useAdminDashboard, type AdminBookingItem, type AdminDashboardData } from '../hooks/useAdminDashboard';
import { useAuth } from '../state/AuthContext';
import {
  ArrowRightIcon,
  BuildingIcon,
  CalendarIcon,
  ClockIcon,
  CreditCardIcon,
  DoorIcon,
  PlusIcon,
  TaskIcon,
  TrendUpIcon,
  UsersIcon,
} from '../components/icons';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`));
}

function splitTimeSlot(value: string) {
  const [start = value, end = ''] = value.split(' - ');
  return { start, end };
}

function BookingList({ bookings, emptyMessage, showDate = false }: { bookings: AdminBookingItem[]; emptyMessage: string; showDate?: boolean }) {
  if (bookings.length === 0) return <p className="admin-schedule__empty">{emptyMessage}</p>;
  return <ul className={`admin-booking-list${showDate ? ' is-upcoming' : ' is-today'}`}>{bookings.slice(0, 4).map((booking) => {
    const { start, end } = splitTimeSlot(booking.timeSlot);
    const status = booking.checkedInAt ? 'Em andamento' : booking.adminStatus === 'pending' ? 'Pendente' : 'Confirmado';
    return <li key={booking.id}>
      <div className="admin-booking-list__when">{showDate ? <><CalendarIcon width="21" height="21" /><span><strong>{formatDate(booking.date)}</strong><small>{start}</small></span></> : <><i aria-hidden="true" /><span><strong>{start}</strong><small>{end}</small></span></>}</div>
      <div className="admin-booking-list__subject"><strong>{booking.roomName}</strong><span>{booking.userName}</span></div>
      <div className="admin-booking-list__place"><i aria-hidden="true" /><span><strong>{booking.roomName}</strong><small>{booking.unitName}</small></span></div>
      <span className={`admin-booking-status is-${booking.checkedInAt ? 'active' : booking.adminStatus}`}>{status}</span>
    </li>;
  })}</ul>;
}

function getMonthEnd(key: string) {
  const [yearValue, monthValue] = key.split('-');
  return `${key}-${String(new Date(Number(yearValue), Number(monthValue), 0).getDate()).padStart(2, '0')}`;
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
  const maximum = Math.max(5, ...visibleMonths.flatMap(({ active, cancelled }) => [active, cancelled]));
  const width = 720;
  const height = 220;
  const chartTop = 16;
  const chartBottom = 184;
  const step = width / visibleMonths.length;
  const y = (value: number) => chartBottom - (value / maximum) * (chartBottom - chartTop);
  const cancelledPoints = visibleMonths.map((month, index) => `${index * step + step / 2},${y(month.cancelled)}`).join(' ');
  const selectedUnitName = units.find(({ id }) => id === unitId)?.name;

  return <section className="admin-monthly-chart" aria-labelledby="monthly-bookings-title">
    <header>
      <div><h2 id="monthly-bookings-title">Reservas nos últimos {range} meses</h2><div className="admin-chart-legend" aria-label="Séries exibidas"><button type="button" className={`is-active${showActive ? ' is-visible' : ''}`} aria-pressed={showActive} onClick={() => { if (showCancelled || !showActive) setShowActive((value) => !value); }}>Ativas</button><button type="button" className={`is-cancelled${showCancelled ? ' is-visible' : ''}`} aria-pressed={showCancelled} onClick={() => { if (showActive || !showCancelled) setShowCancelled((value) => !value); }}>Canceladas</button></div></div>
      <div className="admin-chart-controls"><div className="admin-chart-range" aria-label="Período do gráfico"><button type="button" className={range === 6 ? 'is-active' : ''} onClick={() => setRange(6)}><CalendarIcon width="14" height="14" />6 meses</button><button type="button" className={range === 12 ? 'is-active' : ''} onClick={() => setRange(12)}>12 meses</button></div><label><BuildingIcon width="14" height="14" /><span className="sr-only">Filtrar gráfico por unidade</span><select value={unitId} onChange={(event) => setUnitId(event.target.value)}><option value="">Todas as unidades</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label></div>
    </header>
    <div className="admin-chart-canvas" role="group" aria-label={`Gráfico de reservas por mês${selectedUnitName ? ` na unidade ${selectedUnitName}` : ''}`}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="0" x2={width} y1={chartTop + line * 42} y2={chartTop + line * 42} className="admin-chart-gridline" />)}
        {showActive && visibleMonths.map((month, index) => <rect key={month.key} x={index * step + step * 0.39} y={y(month.active)} width={step * 0.22} height={Math.max(2, chartBottom - y(month.active))} className="admin-chart-bar" />)}
        {showActive && <polyline points={visibleMonths.map((month, index) => `${index * step + step / 2},${y(month.active)}`).join(' ')} className="admin-chart-line is-active" />}
        {showCancelled && <polyline points={cancelledPoints} className="admin-chart-line is-cancelled" />}
        {showActive && visibleMonths.map((month, index) => <circle key={`active-${month.key}`} cx={index * step + step / 2} cy={y(month.active)} r="4" className="admin-chart-point is-active" />)}
        {showCancelled && visibleMonths.map((month, index) => <circle key={`cancelled-${month.key}`} cx={index * step + step / 2} cy={y(month.cancelled)} r="4" className="admin-chart-point is-cancelled" />)}
      </svg>
      <div className={`admin-chart-months range-${range}`}>{visibleMonths.map((month) => {
        const query = new URLSearchParams({ de: `${month.key}-01`, ate: getMonthEnd(month.key) });
        if (unitId) query.set('unidade', unitId);
        return <Link to={`/admin/agendamentos?${query.toString()}`} key={month.key} aria-label={`${month.label}: ${month.active} ativas e ${month.cancelled} canceladas`}><span>{month.label}</span><span className="admin-chart-tooltip" role="tooltip"><strong>{month.label}{selectedUnitName ? ` · ${selectedUnitName}` : ''}</strong><span><i className="is-active" />Ativas <b>{month.active}</b></span><span><i className="is-cancelled" />Canceladas <b>{month.cancelled}</b></span></span></Link>;
      })}</div>
    </div>
  </section>;
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useAdminDashboard();
  const overview = [
    { label: 'Unidades', value: data?.unitCount, icon: BuildingIcon, to: '/admin/unidades', alert: false },
    { label: 'Salas', value: data?.roomCount, icon: DoorIcon, to: '/admin/salas', alert: false },
    { label: 'Usuários ativos', value: data?.activeUserCount, icon: UsersIcon, to: '/admin/usuarios', alert: false },
    { label: 'Reservas hoje', value: data?.todayBookings.length, icon: CalendarIcon, to: '/admin/painel-do-dia', alert: false },
    { label: 'Pagamentos pendentes', value: data?.pendingPaymentCount, icon: CreditCardIcon, to: '/admin/agendamentos', alert: true },
  ] as const;

  return <main className="admin-dashboard">
    <header className="admin-dashboard__intro">
      <div><h1>Dashboard</h1><p>Bom dia, {user?.name ?? 'Administrador'}</p></div>
      <nav className="admin-dashboard__shortcuts" aria-label="Ações rápidas">
        <Link to="/admin/agendamentos?novo=1"><PlusIcon width="21" height="21" />Nova reserva</Link>
        <Link to="/admin/salas"><DoorIcon width="21" height="21" />Gerenciar salas</Link>
        <Link to="/admin/unidades"><BuildingIcon width="21" height="21" />Gerenciar unidades</Link>
      </nav>
    </header>
    {error && <div className="admin-dashboard__error" role="alert"><span>{error}</span><button type="button" onClick={() => void reload()}>Tentar novamente</button></div>}

    <section className="admin-overview-strip" aria-label="Resumo administrativo" aria-busy={isLoading}>{overview.map(({ label, value, icon: Icon, to, alert }) => <Link to={to} key={label} className={alert && Number(value) > 0 ? 'is-alert' : undefined}>
      <Icon width="29" height="29" /><span>{label}<strong className={isLoading ? 'admin-skeleton admin-skeleton--inline' : ''}>{isLoading ? '' : value}</strong></span>
    </Link>)}</section>

    <section className="admin-command-grid" aria-label="Análise e pendências">
      {isLoading || !data ? <div className="admin-monthly-chart admin-skeleton admin-skeleton--chart" aria-label="Carregando gráfico" /> : <MonthlyBookingsChart months={data.monthlyBookings} units={data.chartUnits} />}
      <aside className="admin-attention" aria-labelledby="admin-attention-title">
        <header><h2 id="admin-attention-title">Precisa de atenção</h2></header>
        <div className="admin-attention__list">
          <article><span className="admin-attention__icon is-danger"><CreditCardIcon width="20" height="20" /></span><div><strong>{data?.pendingPaymentCount ?? 0} pagamentos pendentes</strong><small>Total: {data?.pendingPaymentCount ?? 0} reservas</small></div><Link to="/admin/agendamentos">Ver pagamentos <ArrowRightIcon width="14" height="14" /></Link></article>
          <article><span className="admin-attention__icon is-danger"><ClockIcon width="20" height="20" /></span><div><strong>{data?.awaitingArrivalTodayCount ?? 0} chegadas aguardadas</strong><small>Confirmadas e sem check-in hoje</small></div><Link to="/admin/painel-do-dia">Ver reservas <ArrowRightIcon width="14" height="14" /></Link></article>
          <article><span className="admin-attention__icon is-info"><TaskIcon width="20" height="20" /></span><div><strong>{data?.attentionTaskCount ?? 0} tarefas para hoje</strong><small>Vencidas ou com prazo hoje</small></div><Link to="/admin/tarefas">Ver tarefas <ArrowRightIcon width="14" height="14" /></Link></article>
        </div>
      </aside>
    </section>

    <section className="admin-schedules" aria-label="Agenda administrativa">
      <article className="admin-schedule"><header className="admin-schedule__header"><h2>Agenda de hoje</h2></header>{isLoading ? <div className="admin-skeleton admin-skeleton--panel" /> : <BookingList bookings={data?.todayBookings ?? []} emptyMessage="Nenhum agendamento para hoje" />}<Link className="admin-schedule__footer" to="/admin/painel-do-dia">Ver agenda completa <ArrowRightIcon width="15" height="15" /></Link></article>
      <article className="admin-schedule"><header className="admin-schedule__header"><h2>Próximos agendamentos</h2></header>{isLoading ? <div className="admin-skeleton admin-skeleton--panel" /> : <BookingList bookings={data?.nextBookings ?? []} emptyMessage="Nenhum agendamento nos próximos dias" showDate />}<Link className="admin-schedule__footer" to="/admin/agendamentos">Ver todos os agendamentos <ArrowRightIcon width="15" height="15" /></Link></article>
    </section>
  </main>;
}
