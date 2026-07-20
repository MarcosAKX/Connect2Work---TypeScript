import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { CalendarIcon } from '../components/icons';
import { services } from '../services';
import { useAuth } from '../state/AuthContext';
import type { Booking, BookingCounts, BookingStatus, Room, Unit } from '../types/domain';
import { canCancelBooking } from '../utils/booking';

const statuses: BookingStatus[] = ['upcoming', 'past', 'cancelled'];
const labels: Record<BookingStatus, string> = { upcoming: 'Próximos', past: 'Passados', cancelled: 'Cancelados' };
const emptyCounts: BookingCounts = { upcoming: 0, past: 0, cancelled: 0 };

export function BookingsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<BookingStatus>('upcoming');
  const [counts, setCounts] = useState<BookingCounts>(emptyCounts);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [units, setUnits] = useState<Record<string, Unit>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!user) return;
    void services.bookings.getCounts(user.id).then(setCounts);
    void services.bookings.getByUserAndStatus(user.id, status).then(setBookings);
  }, [status, user]);

  useEffect(() => {
    void services.catalog.getUnits().then(async (catalogUnits) => {
      setUnits(Object.fromEntries(catalogUnits.map((unit) => [unit.id, unit])));
      const catalogRooms = (await Promise.all(catalogUnits.map((unit) => services.catalog.getRoomsByUnitId(unit.id)))).flat();
      setRooms(Object.fromEntries(catalogRooms.map((room) => [room.id, room])));
    });
  }, []);

  useEffect(() => {
    if (feedback?.type !== 'success') return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function cancelBooking(booking: Booking) {
    if (!user || cancellingId) return;
    setCancellingId(booking.id);
    setFeedback(null);
    try {
      await services.bookings.cancel(booking.id, user.id);
      const [nextCounts, nextBookings] = await Promise.all([
        services.bookings.getCounts(user.id),
        services.bookings.getByUserAndStatus(user.id, status),
      ]);
      setCounts(nextCounts);
      setBookings(nextBookings);
      setConfirmingId(null);
      setFeedback({ type: 'success', message: 'Agendamento cancelado com sucesso.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível cancelar o agendamento.' });
    } finally {
      setCancellingId(null);
    }
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + statuses.length) % statuses.length;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % statuses.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = statuses.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextStatus = statuses[nextIndex];
    if (!nextStatus) return;
    setStatus(nextStatus);
    tabRefs.current[nextIndex]?.focus();
  }

  function formatBookingDate(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
  }

  return (
    <main className="bookings-page">
      <BackLink to="/unidades" />
      {feedback && <p className={`booking-feedback booking-feedback--${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
      <header className="bookings-header"><div><h1>Meus <span className="text-accent">Agendamentos</span></h1><p className="bookings-subtitle">Gerencie suas reservas de salas</p></div><Link to="/unidades" className="btn btn-primary btn--inline bookings-header__action">+ Novo Agendamento</Link></header>
      <div className="bookings-tabs" role="tablist" aria-label="Filtrar agendamentos">
        {statuses.map((item, index) => <button key={item} ref={(element) => { tabRefs.current[index] = element; }} type="button" className={`bookings-tab${status === item ? ' is-active' : ''}`} role="tab" aria-selected={status === item} tabIndex={status === item ? 0 : -1} onClick={() => setStatus(item)} onKeyDown={(event) => handleTabKey(event, index)}>{labels[item]} <span className="bookings-tab__count">({counts[item]})</span></button>)}
      </div>
      <section className="bookings-panel" role="tabpanel" aria-live="polite">
        {bookings.length === 0 ? <div className="bookings-empty"><div className="bookings-empty__icon"><CalendarIcon width="28" height="28" /></div><h2>Nenhum agendamento</h2><p>Você ainda não possui reservas nesta categoria. Escolha uma unidade e agende sua sala.</p><Link to="/unidades" className="btn btn-primary btn--inline bookings-empty__action">Fazer Agendamento</Link></div> : bookings.map((booking) => {
          const room = rooms[booking.roomId];
          const unit = units[booking.unitId];
          const canCancel = canCancelBooking(booking);
          const isConfirming = confirmingId === booking.id;
          const isCancelling = cancellingId === booking.id;
          return <article className="card booking-card" key={booking.id}>
            <div className="booking-card__content">
              <div><p className="booking-card__eyebrow">{unit?.name ?? 'Unidade'}</p><h2>{room?.name ?? 'Sala reservada'}</h2></div>
              <dl className="booking-card__details"><div><dt>Data</dt><dd>{formatBookingDate(booking.date)}</dd></div><div><dt>Horário</dt><dd>{booking.timeSlot}</dd></div></dl>
            </div>
            {status === 'upcoming' && <div className="booking-card__actions">
              {canCancel ? (isConfirming ? <div className="booking-cancel-confirm" role="group" aria-label="Confirmar cancelamento"><p>Deseja cancelar esta reserva?</p><div><button className="btn booking-action-secondary" type="button" onClick={() => setConfirmingId(null)} disabled={isCancelling}>Manter reserva</button><button className="btn booking-action-danger" type="button" onClick={() => void cancelBooking(booking)} disabled={isCancelling}>{isCancelling ? 'Cancelando…' : 'Confirmar cancelamento'}</button></div></div> : <button className="btn booking-action-danger booking-action-danger--outline" type="button" onClick={() => { setConfirmingId(booking.id); setFeedback(null); }}>Cancelar agendamento</button>) : <p className="booking-card__restriction">Cancelamento indisponível: faltam menos de 24 horas.</p>}
            </div>}
          </article>;
        })}
      </section>
      <aside className="cancellation-notice"><h2>Política de Cancelamento</h2><p>Cancelamentos realizados com pelo menos 24 horas de antecedência recebem reembolso integral. Cancelamentos feitos com menos de 24 horas de antecedência não são reembolsados.</p></aside>
    </main>
  );
}
