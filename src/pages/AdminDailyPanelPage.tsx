import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CalendarIcon, CheckIcon, ClockIcon, CreditCardIcon, DoorIcon, UserIcon } from '../components/icons';
import { useAdminBookings, type AdminBookingRow } from '../hooks/useAdminBookings';
import { useAuth } from '../state/AuthContext';
import '../assets/css/pages/admin-bookings.css';
import '../assets/css/pages/admin-daily-panel.css';
import '../assets/css/pages/admin-operations-polish.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
type OperationalFilter = 'all' | 'waiting' | 'present' | 'payment' | 'checked-in' | 'cancelled';
type PeriodFilter = 'all' | 'morning' | 'afternoon' | 'next';

function formatCheckInTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`));
}

function formatUpcomingDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`));
}

function getStartTime(value: string) { return value.split('-')[0]?.trim() ?? value; }
function getEndTime(value: string) { return value.split('-')[1]?.trim() ?? value; }

function ConfirmPaymentDialog({ item, isSaving, error, onClose, onConfirm }: { item: AdminBookingRow; isSaving: boolean; error: string; onClose(): void; onConfirm(): Promise<void> }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className="admin-bookings-modal" aria-labelledby="daily-confirm-payment-title" onCancel={(event) => { event.preventDefault(); if (!isSaving) onClose(); }}><div><span className="admin-bookings-modal__icon admin-bookings-modal__icon--success"><CreditCardIcon width="22" height="22" /></span><h2 id="daily-confirm-payment-title">Confirmar pagamento?</h2><p>Confirma o recebimento de <strong>{money.format(item.total)}</strong> pelo agendamento de <strong>{item.clientName}</strong>?</p>{error && <p className="admin-bookings-modal__error" role="alert">{error}</p>}<footer><button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Ainda não foi pago</button><button type="button" className="btn btn-primary" onClick={() => void onConfirm()} disabled={isSaving}>{isSaving ? 'Confirmando…' : 'Confirmar pagamento'}</button></footer></div></dialog>;
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
  const attentionCount = data.dayPanel.pendingPayments.length + data.dayPanel.waitingArrival.length;
  const firstPendingPayment = data.dayPanel.pendingPayments[0];
  const firstWaitingArrival = data.dayPanel.waitingArrival[0];

  const filteredTodayBookings = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const nowMinutes = data.dayPanel.now.getHours() * 60 + data.dayPanel.now.getMinutes();
    const presentIds = new Set(data.dayPanel.presentNow.map(({ booking }) => booking.id));
    return data.dayPanel.todayBookings.filter((item) => {
      const [hours = 0, minutes = 0] = getStartTime(item.booking.timeSlot).split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const paymentPending = (item.booking.paymentStatus ?? 'completed') === 'pending' && item.adminStatus !== 'cancelled';
      const matchesSearch = !term || [item.clientName, item.roomName, item.unitName].some((value) => value.toLocaleLowerCase('pt-BR').includes(term));
      const matchesUnit = !unitId || item.booking.unitId === unitId;
      const matchesOperation = operationalFilter === 'all'
        || (operationalFilter === 'waiting' && item.adminStatus === 'confirmed' && !item.booking.checkedInAt)
        || (operationalFilter === 'present' && presentIds.has(item.booking.id))
        || (operationalFilter === 'payment' && paymentPending)
        || (operationalFilter === 'checked-in' && Boolean(item.booking.checkedInAt))
        || (operationalFilter === 'cancelled' && item.adminStatus === 'cancelled');
      const matchesPeriod = periodFilter === 'all'
        || (periodFilter === 'morning' && startMinutes < 720)
        || (periodFilter === 'afternoon' && startMinutes >= 720)
        || (periodFilter === 'next' && startMinutes >= nowMinutes && startMinutes <= nowMinutes + 180);
      return matchesSearch && matchesUnit && matchesOperation && matchesPeriod;
    });
  }, [data.dayPanel.now, data.dayPanel.presentNow, data.dayPanel.todayBookings, operationalFilter, periodFilter, search, unitId]);

  const upcomingDays = useMemo(() => {
    const counts = new Map<string, number>();
    data.dayPanel.upcomingBookings.forEach(({ booking }) => counts.set(booking.date, (counts.get(booking.date) ?? 0) + 1));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(`${data.today}T12:00:00`);
      date.setDate(date.getDate() + index + 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { key, count: counts.get(key) ?? 0 };
    });
  }, [data.dayPanel.upcomingBookings, data.today]);

  const hasActiveFilters = Boolean(search || unitId || operationalFilter !== 'all' || periodFilter !== 'all');
  useEffect(() => { if (!statusMessage) return; const timer = window.setTimeout(() => setStatusMessage(''), 5000); return () => window.clearTimeout(timer); }, [statusMessage]);

  async function checkIn(item: AdminBookingRow) {
    if (user && await data.checkInBooking(item.booking.id, user.id)) setStatusMessage('Check-in realizado com sucesso.');
  }
  async function confirmPayment() {
    if (confirmingPayment && await data.confirmPayment(confirmingPayment.booking.id)) { setConfirmingPayment(null); setStatusMessage('Pagamento confirmado com sucesso.'); }
  }
  function clearFilters() { setSearch(''); setUnitId(''); setOperationalFilter('all'); setPeriodFilter('all'); }

  return <main className="admin-daily-page">
    <header className="admin-daily-page__intro"><div><h1>Painel do Dia</h1><p><span>{formatLongDate(data.today)}</span><i aria-hidden="true" /><ClockIcon width="16" height="16" />Agora <strong>{currentTime}</strong></p></div></header>
    {statusMessage && <p className="admin-bookings-page__status" role="status">{statusMessage}</p>}
    {data.error && <div className="admin-bookings-page__error" role="alert"><span>{data.error}</span><button type="button" onClick={() => void data.reload()}>Tentar novamente</button></div>}
    {data.mutationError && !confirmingPayment && <div className="admin-bookings-page__error" role="alert"><span>{data.mutationError}</span><button type="button" onClick={data.clearMutationError}>Fechar</button></div>}

    <section className="admin-day-metrics" aria-label="Resumo operacional de hoje" aria-busy={data.isLoading}>
      <article><DoorIcon width="29" height="29" /><div><strong>{data.dayPanel.presentNow.length}</strong><p>salas ocupadas</p></div></article>
      <article><CreditCardIcon width="29" height="29" /><div><strong>{data.dayPanel.pendingPayments.length}</strong><p>{data.dayPanel.pendingPayments.length === 1 ? 'pagamento pendente' : 'pagamentos pendentes'}</p></div></article>
      <article><UserIcon className="is-info" width="29" height="29" /><div><strong>{data.stats.checkInsToday} <small>de {data.stats.today}</small></strong><p>check-ins</p></div></article>
      <article><ClockIcon width="29" height="29" /><div><p>Próxima chegada</p><strong>{data.dayPanel.nextArrival ? getStartTime(data.dayPanel.nextArrival.booking.timeSlot) : '—'}</strong></div></article>
    </section>

    <section className="admin-day-panel" aria-labelledby="today-agenda-title">
      <div className="admin-daily-filters" role="search" aria-label="Filtrar agenda de hoje">
        <label className="admin-daily-filters__search"><span className="admin-filter-label">Buscar</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente ou sala" /></label>
        <label><span className="admin-filter-label">Unidade</span><select value={unitId} onChange={(event) => setUnitId(event.target.value)}><option value="">Todas as unidades</option>{data.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
        <label><span className="admin-filter-label">Situação</span><select value={operationalFilter} onChange={(event) => setOperationalFilter(event.target.value as OperationalFilter)}><option value="all">Todas as situações</option><option value="waiting">Aguardando chegada</option><option value="present">Presentes agora</option><option value="payment">Pagamento pendente</option><option value="checked-in">Check-in realizado</option><option value="cancelled">Cancelados</option></select></label>
        <label><span className="admin-filter-label">Período</span><select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}><option value="all">Dia inteiro</option><option value="morning">Manhã</option><option value="afternoon">Tarde</option><option value="next">Próximas 3 horas</option></select></label>
        {hasActiveFilters && <button type="button" onClick={clearFilters}>Limpar filtros</button>}
      </div>

      <div className="admin-day-workspace">
        <section className="admin-day-agenda" aria-labelledby="today-agenda-title">
          <header><h2 id="today-agenda-title">Agenda de Hoje</h2><span>{filteredTodayBookings.length} reservas</span></header>
          {filteredTodayBookings.length === 0 ? <div className="admin-day-empty"><CalendarIcon width="25" height="25" /><p>{data.dayPanel.todayBookings.length === 0 ? 'Nenhum agendamento para hoje.' : 'Nenhuma reserva corresponde aos filtros.'}</p>{hasActiveFilters && <button type="button" onClick={clearFilters}>Limpar filtros</button>}</div> : <div className="admin-day-agenda__table"><div className="admin-day-agenda__head"><span>Horário</span><span>Sala</span><span>Cliente</span><span>Unidade</span><span>Pagamento</span><span>Check-in</span><span>Ações</span></div><div className="admin-day-agenda__list">{filteredTodayBookings.map((item) => {
            const paymentPending = (item.booking.paymentStatus ?? 'completed') === 'pending' && item.adminStatus !== 'cancelled';
            return <article key={item.booking.id} className={`is-${item.adminStatus}`}>
              <time dateTime={`${item.booking.date}T${getStartTime(item.booking.timeSlot)}`}><i aria-hidden="true" /><strong>{getStartTime(item.booking.timeSlot)}</strong><small>{getEndTime(item.booking.timeSlot)}</small></time>
              <div><strong>{item.roomName}</strong><span>Reserva ativa</span></div>
              <div><strong>{item.clientName}</strong><span>Cliente</span></div>
              <div><span>{item.unitName}</span></div>
              <div className={`admin-day-payment is-${paymentPending ? 'pending' : 'paid'}`}><CheckIcon width="15" height="15" />{paymentPending ? 'Pendente' : 'Pago'}</div>
              <div className={`admin-day-checkin${item.booking.checkedInAt ? ' is-completed' : ''}`}><ClockIcon width="15" height="15" /><span>{item.booking.checkedInAt ? `Cliente chegou` : item.adminStatus === 'confirmed' ? 'Aguardando chegada' : 'Não disponível'}{item.booking.checkedInAt && <small>{formatCheckInTime(item.booking.checkedInAt)}</small>}</span></div>
              <div className="admin-day-action">{paymentPending ? <button type="button" className="is-payment" onClick={() => { data.clearMutationError(); setConfirmingPayment(item); }} disabled={data.isSaving}>Confirmar pagamento</button> : item.adminStatus === 'confirmed' && !item.booking.checkedInAt ? <button type="button" className="is-checkin" onClick={() => void checkIn(item)} disabled={data.isSaving}>Check-in</button> : <Link to={`/admin/agendamentos?de=${data.today}&ate=${data.today}`}>Ver detalhes <ArrowRightIcon width="13" height="13" /></Link>}</div>
            </article>;
          })}</div></div>}
          <Link className="admin-day-section-footer" to={`/admin/agendamentos?de=${data.today}&ate=${data.today}`}>Ver agenda completa <ArrowRightIcon width="15" height="15" /></Link>
        </section>

        <div className="admin-day-side">
          <aside className="admin-day-attention" aria-labelledby="daily-attention-title"><header><h2 id="daily-attention-title">Precisa de atenção</h2><span>{attentionCount}</span></header><div>
            {firstPendingPayment && <article><span className="is-warning"><CreditCardIcon width="19" height="19" /></span><div><strong>Pagamento pendente</strong><small>{firstPendingPayment.roomName} · {firstPendingPayment.clientName}</small><small>Reserva hoje às {getStartTime(firstPendingPayment.booking.timeSlot)}</small></div><button type="button" className="btn btn-primary" onClick={() => { data.clearMutationError(); setConfirmingPayment(firstPendingPayment); }}>Confirmar pagamento</button></article>}
            {firstWaitingArrival && <article><span className="is-danger"><ClockIcon width="19" height="19" /></span><div><strong>Check-in aguardado</strong><small>{firstWaitingArrival.roomName} · {firstWaitingArrival.clientName}</small><small>Reserva às {getStartTime(firstWaitingArrival.booking.timeSlot)}</small></div><button type="button" className="btn btn-secondary" onClick={() => void checkIn(firstWaitingArrival)}>Registrar chegada</button></article>}
            {!firstPendingPayment && !firstWaitingArrival && <p className="admin-day-attention__empty"><CheckIcon width="19" height="19" />Nenhuma pendência operacional agora.</p>}
          </div><Link to="/admin/agendamentos">Ver todas as pendências ({attentionCount}) <ArrowRightIcon width="15" height="15" /></Link></aside>

          <aside className="admin-day-upcoming" aria-labelledby="upcoming-title"><header><h2 id="upcoming-title">Próximos 7 dias</h2></header><div className="admin-day-upcoming__days">{upcomingDays.map(({ key, count }) => <Link key={key} to={`/admin/agendamentos?de=${key}&ate=${key}`}><CalendarIcon width="16" height="16" /><span>{formatUpcomingDate(key)}</span><strong>{count} {count === 1 ? 'reserva' : 'reservas'}</strong><ArrowRightIcon width="14" height="14" /></Link>)}</div><Link className="admin-day-section-footer" to={`/admin/agendamentos?de=${data.dayPanel.tomorrowDate}&ate=${data.dayPanel.nextWeekDate}`}>Ver calendário completo <ArrowRightIcon width="15" height="15" /></Link></aside>
        </div>
      </div>
    </section>
    {confirmingPayment && <ConfirmPaymentDialog item={confirmingPayment} isSaving={data.isSaving} error={data.mutationError} onClose={() => { setConfirmingPayment(null); data.clearMutationError(); }} onConfirm={confirmPayment} />}
  </main>;
}
