import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CalendarIcon, CheckIcon, ClockIcon, CurrencyIcon, UserIcon } from '../components/icons';
import { useAdminBookings, type AdminBookingRow } from '../hooks/useAdminBookings';
import { useAuth } from '../state/AuthContext';
import '../assets/css/pages/admin-bookings.css';
import '../assets/css/pages/admin-daily-panel.css';
import '../assets/css/pages/admin-operations-polish.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const statusLabels = { confirmed: 'Confirmado', pending: 'Pendente', cancelled: 'Cancelado' } as const;
type OperationalFilter = 'all' | 'waiting' | 'present' | 'payment' | 'checked-in' | 'cancelled';
type PeriodFilter = 'all' | 'morning' | 'afternoon' | 'next';

function formatCheckInTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    .format(new Date(`${value}T12:00:00`))
    .replace('.', '');
}

function getStartTime(value: string) { return value.split('-')[0]?.trim() ?? value; }
function getEndTime(value: string) { return value.split('-')[1]?.trim() ?? value; }

function ConfirmPaymentDialog({ item, isSaving, error, onClose, onConfirm }: { item: AdminBookingRow; isSaving: boolean; error: string; onClose(): void; onConfirm(): Promise<void> }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className="admin-bookings-modal" aria-labelledby="daily-confirm-payment-title" onCancel={(event) => { event.preventDefault(); if (!isSaving) onClose(); }}><div><span className="admin-bookings-modal__icon admin-bookings-modal__icon--success"><CurrencyIcon width="22" height="22" /></span><h2 id="daily-confirm-payment-title">Confirmar pagamento?</h2><p>Confirma o recebimento de <strong>{money.format(item.total)}</strong> pelo agendamento de <strong>{item.clientName}</strong>?</p>{error && <p className="admin-bookings-modal__error" role="alert">{error}</p>}<footer><button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Ainda não foi pago</button><button type="button" className="btn btn-primary" onClick={() => void onConfirm()} disabled={isSaving}>{isSaving ? 'Confirmando…' : 'Confirmar pagamento'}</button></footer></div></dialog>;
}

export function AdminDailyPanelPage() {
  const { user } = useAuth();
  const data = useAdminBookings();
  const [confirmingPayment, setConfirmingPayment] = useState<AdminBookingRow | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [search, setSearch] = useState('');
  const [unitId, setUnitId] = useState('');
  const [operationalFilter, setOperationalFilter] = useState<OperationalFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const currentTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(data.dayPanel.now);
  const filteredTodayBookings = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const nowMinutes = data.dayPanel.now.getHours() * 60 + data.dayPanel.now.getMinutes();
    const presentIds = new Set(data.dayPanel.presentNow.map(({ booking }) => booking.id));
    return data.dayPanel.todayBookings.filter((item) => {
      const start = getStartTime(item.booking.timeSlot);
      const [hours = 0, minutes = 0] = start.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const matchesSearch = !term || [item.clientName, item.roomName, item.unitName].some((value) => value.toLocaleLowerCase('pt-BR').includes(term));
      const matchesUnit = !unitId || item.booking.unitId === unitId;
      const paymentPending = (item.booking.paymentStatus ?? 'completed') === 'pending' && item.adminStatus !== 'cancelled';
      const matchesOperation = operationalFilter === 'all'
        || (operationalFilter === 'waiting' && item.adminStatus === 'confirmed' && !item.booking.checkedInAt)
        || (operationalFilter === 'present' && presentIds.has(item.booking.id))
        || (operationalFilter === 'payment' && paymentPending)
        || (operationalFilter === 'checked-in' && Boolean(item.booking.checkedInAt))
        || (operationalFilter === 'cancelled' && item.adminStatus === 'cancelled');
      const matchesPeriod = periodFilter === 'all'
        || (periodFilter === 'morning' && startMinutes < 12 * 60)
        || (periodFilter === 'afternoon' && startMinutes >= 12 * 60)
        || (periodFilter === 'next' && startMinutes >= nowMinutes && startMinutes <= nowMinutes + 180);
      return matchesSearch && matchesUnit && matchesOperation && matchesPeriod;
    });
  }, [data.dayPanel.now, data.dayPanel.presentNow, data.dayPanel.todayBookings, operationalFilter, periodFilter, search, unitId]);
  const hasActiveFilters = Boolean(search || unitId || operationalFilter !== 'all' || periodFilter !== 'all');

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(''), 5000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  async function checkIn(item: AdminBookingRow) {
    if (user && await data.checkInBooking(item.booking.id, user.id)) setStatusMessage('Check-in realizado com sucesso.');
  }

  async function confirmPayment() {
    if (confirmingPayment && await data.confirmPayment(confirmingPayment.booking.id)) {
      setConfirmingPayment(null);
      setStatusMessage('Pagamento confirmado com sucesso.');
    }
  }

  function clearFilters() {
    setSearch('');
    setUnitId('');
    setOperationalFilter('all');
    setPeriodFilter('all');
  }

  return <main className="admin-daily-page">
    <header className="admin-daily-page__intro">
      <div><h1><CalendarIcon width="31" height="31" />Painel do Dia</h1><p>Acompanhe chegadas, presença e pendências de hoje</p></div>
      <Link to="/admin/agendamentos" className="btn btn-secondary btn--inline">Ver todos os agendamentos</Link>
    </header>
    {statusMessage && <p className="admin-bookings-page__status" role="status">{statusMessage}</p>}
    {data.error && <div className="admin-bookings-page__error" role="alert"><span>{data.error}</span><button type="button" onClick={() => void data.reload()}>Tentar novamente</button></div>}
    {data.mutationError && !confirmingPayment && <div className="admin-bookings-page__error" role="alert"><span>{data.mutationError}</span><button type="button" onClick={data.clearMutationError}>Fechar</button></div>}
    <section className="admin-day-panel" aria-labelledby="admin-day-title" aria-busy={data.isLoading}>
      <header className="admin-day-panel__header"><div><h2 id="admin-day-title">Visão operacional</h2><p>{formatLongDate(data.today)}</p></div><span className="admin-daily-live"><i />Atualização local</span></header>
      <div className="admin-day-metrics">
        <article><span className="tone-accent"><ClockIcon width="18" height="18" /></span><div><strong>{data.dayPanel.waitingArrival.length}</strong><p>Aguardando chegada</p></div></article>
        <article><span className="tone-success"><UserIcon width="18" height="18" /></span><div><strong>{data.dayPanel.presentNow.length}</strong><p>Presentes agora</p></div></article>
        <article><span className="tone-warning"><CurrencyIcon width="18" height="18" /></span><div><strong>{data.dayPanel.pendingPayments.length}</strong><p>Pagamentos pendentes</p></div></article>
        <article><span className="tone-info"><CheckIcon width="18" height="18" /></span><div><strong>{data.stats.checkInsToday} <small>de {data.stats.today}</small></strong><p>Check-ins hoje</p></div></article>
      </div>
      <div className="admin-day-now"><span>Agora · {currentTime}</span>{data.dayPanel.nextArrival ? <p>Próxima chegada: <strong>{data.dayPanel.nextArrival.clientName}</strong>, às {getStartTime(data.dayPanel.nextArrival.booking.timeSlot)} · {data.dayPanel.nextArrival.roomName}</p> : <p>Nenhuma chegada futura aguardando check-in hoje.</p>}</div>
      <div className="admin-daily-filters" role="search" aria-label="Filtrar agenda de hoje">
        <label className="admin-daily-filters__search"><span className="admin-filter-label">Buscar</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente ou sala" /></label>
        <label><span className="admin-filter-label">Unidade</span><select value={unitId} onChange={(event) => setUnitId(event.target.value)}><option value="">Todas as unidades</option>{data.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
        <label><span className="admin-filter-label">Situação</span><select value={operationalFilter} onChange={(event) => setOperationalFilter(event.target.value as OperationalFilter)}><option value="all">Todas as situações</option><option value="waiting">Aguardando chegada</option><option value="present">Presentes agora</option><option value="payment">Pagamento pendente</option><option value="checked-in">Check-in realizado</option><option value="cancelled">Cancelados</option></select></label>
        <label><span className="admin-filter-label">Período</span><select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}><option value="all">Dia inteiro</option><option value="morning">Manhã</option><option value="afternoon">Tarde</option><option value="next">Próximas 3 horas</option></select></label>
        {hasActiveFilters && <button type="button" onClick={clearFilters}>Limpar filtros</button>}
      </div>
      <div className="admin-day-workspace">
        <section className="admin-day-agenda" aria-labelledby="today-agenda-title">
          <header><div><h3 id="today-agenda-title">Agenda de hoje</h3><p>Ordem de chegada e ações rápidas</p></div><span>{filteredTodayBookings.length} de {data.dayPanel.todayBookings.length} reservas</span></header>
          {filteredTodayBookings.length === 0 ? <div className="admin-day-empty"><CalendarIcon width="25" height="25" /><p>{data.dayPanel.todayBookings.length === 0 ? 'Nenhum agendamento para hoje.' : 'Nenhuma reserva corresponde aos filtros.'}</p>{hasActiveFilters && <button type="button" onClick={clearFilters}>Limpar filtros</button>}</div> : <div className="admin-day-agenda__list">{filteredTodayBookings.map((item) => {
            const paymentPending = (item.booking.paymentStatus ?? 'completed') === 'pending' && item.adminStatus !== 'cancelled';
            return <article key={item.booking.id} className={`is-${item.adminStatus}`}>
              <time dateTime={`${item.booking.date}T${getStartTime(item.booking.timeSlot)}`}>{getStartTime(item.booking.timeSlot)}</time>
              <div className="admin-day-person"><strong>{item.clientName}</strong><span>{item.booking.checkedInAt ? `Chegou às ${formatCheckInTime(item.booking.checkedInAt)}` : statusLabels[item.adminStatus]}</span></div>
              <div className="admin-day-room"><strong>{item.roomName}</strong><span>até {getEndTime(item.booking.timeSlot)} · {item.unitName}</span></div>
              <div className="admin-day-action">{item.adminStatus === 'confirmed' && !item.booking.checkedInAt ? <button type="button" className="is-checkin" onClick={() => void checkIn(item)} disabled={data.isSaving}><UserIcon width="14" height="14" />Check-in</button> : paymentPending ? <button type="button" className="is-payment" onClick={() => { data.clearMutationError(); setConfirmingPayment(item); }} disabled={data.isSaving}>Confirmar pagamento</button> : <span className={`is-${item.adminStatus}`}>{item.adminStatus === 'confirmed' ? 'Em dia' : statusLabels[item.adminStatus]}</span>}</div>
            </article>;
          })}</div>}
        </section>
        <aside className="admin-day-upcoming" aria-labelledby="upcoming-title">
          <header><div><h3 id="upcoming-title">Próximos agendamentos</h3><p>Próximos 7 dias</p></div><Link to={`/admin/agendamentos?de=${data.dayPanel.tomorrowDate}&ate=${data.dayPanel.nextWeekDate}`} aria-label="Ver todos os próximos agendamentos">Ver todos <ArrowRightIcon width="14" height="14" /></Link></header>
          {data.dayPanel.upcomingBookings.length === 0 ? <div className="admin-day-upcoming__empty"><CalendarIcon width="24" height="24" /><p>Nenhum agendamento nos próximos sete dias.</p></div> : <div className="admin-day-upcoming__list">{data.dayPanel.upcomingBookings.slice(0, 4).map((item) => <article key={item.booking.id}>
            <time dateTime={`${item.booking.date}T${getStartTime(item.booking.timeSlot)}`}><strong>{formatShortDate(item.booking.date)}</strong><span>{item.booking.timeSlot}</span></time>
            <div><strong>{item.roomName}</strong><span>{item.clientName} · {item.unitName}</span></div>
            <span className={`admin-bookings-badge is-${item.adminStatus}`}>{statusLabels[item.adminStatus]}</span>
          </article>)}</div>}
        </aside>
      </div>
    </section>
    {confirmingPayment && <ConfirmPaymentDialog item={confirmingPayment} isSaving={data.isSaving} error={data.mutationError} onClose={() => { setConfirmingPayment(null); data.clearMutationError(); }} onConfirm={confirmPayment} />}
  </main>;
}
