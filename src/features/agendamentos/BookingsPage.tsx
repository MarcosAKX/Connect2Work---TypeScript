import { Link } from 'react-router-dom';
import { BackLink } from '../../components/BackLink';
import { BookingTabs } from './BookingTabs';
import { BookingList } from './BookingList';
import { useBookings } from './useBookings';
import { useAuth } from '../../state/AuthContext';

export function BookingsPage() {
  const { user } = useAuth();
  const model = useBookings(user);
  const { feedback } = model;

  return (
    <main className="bookings-page">
      <BackLink to="/unidades" />
      {feedback && <p className={`booking-feedback booking-feedback--${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.message}{feedback.type === "error" && <button type="button" className="btn booking-action-secondary" onClick={model.retry} disabled={model.loading}>Atualizar lista</button>}</p>}
      <header className="bookings-header"><div><h1>Meus <span className="text-accent">Agendamentos</span></h1><p className="bookings-subtitle">Gerencie suas reservas de salas</p></div><Link to="/unidades" className="btn btn-primary btn--inline bookings-header__action">+ Novo Agendamento</Link></header>
      <BookingTabs status={model.status} setStatus={model.setStatus} counts={model.counts} />
      <BookingList
        loading={model.loading} status={model.status} bookings={model.bookings} rooms={model.rooms} units={model.units}
        confirmingId={model.confirmingId} cancellingId={model.cancellingId}
        cancelBooking={model.cancelBooking} requestCancel={model.requestCancel} keepBooking={model.keepBooking}
      />
      <div ref={model.moreRef} aria-hidden="true" />
      <aside className="cancellation-notice"><h2>Política de Cancelamento</h2><p>Você pode cancelar com pelo menos 24 horas de antecedência. Em reservas pagas, o reembolso é tratado manualmente pela equipe. Para reservas com horas do plano ou menos de 24 horas de antecedência, entre em contato com a equipe.</p></aside>
    </main>
  );
}

