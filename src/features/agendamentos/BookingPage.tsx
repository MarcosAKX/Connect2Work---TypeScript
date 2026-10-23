import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { useBooking } from './useBooking';
import { RoomGallery } from './RoomGallery';
import { BookingCalendar } from './BookingCalendar';
import { BookingTimeSlots } from './BookingTimeSlots';
import { BookingSummary } from './BookingSummary';
import { PendingBookingReceipt } from './PendingBookingReceipt';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function BookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const booking = useBooking({ roomId: params.get('sala'), user, navigate });
  const { room, unit, selectedDate, selectedSlot } = booking;
  if (booking.loadError) return <main className="booking-page"><p role="alert">{booking.loadError}</p><button type="button" className="btn btn-primary" onClick={booking.retryLoad}>Tentar novamente</button></main>;
  if (room === null || unit === null)
    return <Navigate to="/unidades" replace />;
  if (!room || !unit)
    return (
      <main className="booking-page">
        <p role="status">Carregando agendamento...</p>
      </main>
    );
  if (booking.pendingReservation) return <PendingBookingReceipt booking={booking.pendingReservation} room={room} unit={unit} onNewSelection={booking.resetReservation} />;

  return (
    <main className="booking-page">
      <nav className="booking-breadcrumb" aria-label="Navegação estrutural">
        <Link to={`/salas?unidade=${encodeURIComponent(unit.id)}`}>Salas</Link>
        <span aria-hidden="true">/</span>
        <span>{room.name}</span>
      </nav>
      <div className="booking-layout">
        <section className="booking-content">
          <article className="room-details card">
            <RoomGallery key={room.id} room={room} />
            <div className="room-details__body">
              <div className="room-details__heading">
                <div>
                  <h1>{room.name}</h1>
                  <div className="room-details__meta">
                    <span>{unit.name}</span>
                    <span aria-hidden="true">•</span>
                    <span>
                      {room.capacity === 1
                        ? '1 pessoa'
                        : `${room.capacity} pessoas`}
                    </span>
                  </div>
                </div>
                <span className="room-details__price">
                  {currency.format(room.pricePerHour)}/hora
                </span>
              </div>
              <div className="room-amenities" aria-label="Comodidades da sala">
                {room.amenities.map((amenity) => (
                  <span className="room-amenity" key={amenity}>
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </article>
          <ol className="booking-steps" aria-label="Etapas do agendamento">
            <li className={!selectedDate ? 'is-active' : 'is-complete'}>
              <span>1</span>
              <div>
                <strong>Data</strong>
                <small>Escolha o dia</small>
              </div>
            </li>
            <li
              className={
                selectedDate && !selectedSlot
                  ? 'is-active'
                  : selectedSlot
                    ? 'is-complete'
                    : ''
              }
            >
              <span>2</span>
              <div>
                <strong>Horário</strong>
                <small>Selecione o período</small>
              </div>
            </li>
            <li className={selectedSlot ? 'is-active' : ''}>
              <span>3</span>
              <div>
                <strong>Confirmar</strong>
                <small>Revise e confirme</small>
              </div>
            </li>
          </ol>
          <section className="booking-options">
            <BookingCalendar
              visibleMonth={booking.visibleMonth}
              selectedDate={selectedDate}
              setVisibleMonth={booking.setVisibleMonth}
              selectDate={booking.selectDate}
              businessToday={booking.businessToday}
              isSaving={booking.isSaving}
            />
            <BookingTimeSlots
              slots={booking.slots}
              duration={booking.duration}
              selectTimeSlot={booking.selectTimeSlot}
              availabilityLoading={booking.availabilityLoading}
              availabilityError={booking.availabilityError}
              retryAvailability={booking.retryAvailability}
              isSaving={booking.isSaving}
            />
          </section>
        </section>
        <BookingSummary {...booking} room={room} unit={unit} />
      </div>
    </main>
  );
}
