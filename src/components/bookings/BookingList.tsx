import { Link } from 'react-router-dom';
import { CalendarIcon } from '../icons';
import { canCancelBooking } from '../../utils/booking';
import type { BookingsViewModel } from '../../hooks/useBookings';

function formatBookingDate(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
  }

type BookingListProps = Pick<BookingsViewModel,
  'status' | 'bookings' | 'rooms' | 'units' | 'confirmingId' | 'cancellingId' |
  'cancelBooking' | 'requestCancel' | 'keepBooking'
>;

export function BookingList({
  status, bookings, rooms, units, confirmingId, cancellingId,
  cancelBooking, requestCancel, keepBooking,
}: BookingListProps) {
  return (
      <section className="bookings-panel" role="tabpanel" aria-live="polite">
        {bookings.length === 0 ? <div className="bookings-empty"><div className="bookings-empty__icon"><CalendarIcon width="28" height="28" /></div><h2>Nenhum agendamento</h2><p>Você ainda não possui reservas nesta categoria. Escolha uma unidade e agende sua sala.</p><Link to="/unidades" className="btn btn-primary btn--inline bookings-empty__action">Fazer Agendamento</Link></div> : bookings.map((booking) => {
          const room = rooms[booking.roomId];
          const unit = units[booking.unitId];
          const canCancel = canCancelBooking(booking);
          const isConfirming = confirmingId === booking.id;
          const isCancelling = cancellingId === booking.id;
          return <article className="card booking-card" key={booking.id}>
            <div className="booking-card__content">
              <div><p className="booking-card__eyebrow">{unit?.name ?? 'Unidade'}</p><h2>{room?.name ?? 'Sala reservada'}</h2>{booking.hoursFromPlan ? <span className="booking-hours-plan">Plano de horas · {booking.hoursFromPlan}h</span> : null}</div>
              <dl className="booking-card__details"><div><dt>Data</dt><dd>{formatBookingDate(booking.date)}</dd></div><div><dt>Horário</dt><dd>{booking.timeSlot}</dd></div></dl>
            </div>
            {status === 'upcoming' && <div className="booking-card__actions">
              {canCancel ? (isConfirming ? (
                <div className="booking-cancel-confirm" role="group" aria-label="Confirmar cancelamento">
                  <p>Deseja cancelar esta reserva?</p>
                  <div>
                    <button
                      className="btn booking-action-secondary" type="button"
                      onClick={keepBooking} disabled={isCancelling}
                    >Manter reserva</button>
                    <button
                      className="btn booking-action-danger" type="button"
                      onClick={() => void cancelBooking(booking)} disabled={isCancelling}
                    >{isCancelling ? 'Cancelando…' : 'Confirmar cancelamento'}</button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn booking-action-danger booking-action-danger--outline"
                  type="button" onClick={() => requestCancel(booking.id)}
                >Cancelar agendamento</button>
              )) : (
                <p className="booking-card__restriction">Cancelamento indisponível: faltam menos de 24 horas.</p>
              )}
            </div>}
          </article>;
        })}
      </section>
  );
}
