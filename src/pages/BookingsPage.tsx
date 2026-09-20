import { Link } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { BookingTabs } from '../components/bookings/BookingTabs';
import { BookingList } from '../components/bookings/BookingList';
import { useBookings } from '../hooks/useBookings';
import { useAuth } from '../state/AuthContext';

export function BookingsPage() {
  const { user } = useAuth();
  const model = useBookings(user);
  const { feedback } = model;

  return (
    <main className="bookings-page">
      <BackLink to="/unidades" />
      {feedback && <p className={`booking-feedback booking-feedback--${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
      <header className="bookings-header"><div><h1>Meus <span className="text-accent">Agendamentos</span></h1><p className="bookings-subtitle">Gerencie suas reservas de salas</p></div><Link to="/unidades" className="btn btn-primary btn--inline bookings-header__action">+ Novo Agendamento</Link></header>
      <BookingTabs status={model.status} setStatus={model.setStatus} counts={model.counts} />
      <BookingList
        status={model.status} bookings={model.bookings} rooms={model.rooms} units={model.units}
        confirmingId={model.confirmingId} cancellingId={model.cancellingId}
        cancelBooking={model.cancelBooking} requestCancel={model.requestCancel} keepBooking={model.keepBooking}
      />
      <aside className="cancellation-notice"><h2>Política de Cancelamento</h2><p>Cancelamentos realizados com pelo menos 24 horas de antecedência recebem reembolso integral. Cancelamentos feitos com menos de 24 horas de antecedência não são reembolsados.</p></aside>
    </main>
  );
}
