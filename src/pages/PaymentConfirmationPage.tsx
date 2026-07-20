import { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { CalendarIcon, CheckCircleIcon, ClockIcon, MapPinIcon } from '../components/icons';
import type { PaymentConfirmation } from '../types/domain';

export function PaymentConfirmationPage() {
  const location = useLocation();
  const confirmation = location.state as PaymentConfirmation | null;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  if (!confirmation?.bookingId) return <Navigate to="/meus-agendamentos" replace />;

  return (
    <main className="confirmation-page">
      <section className="confirmation-panel" aria-labelledby="confirmation-title">
        <div className="confirmation-success-icon"><CheckCircleIcon width="42" height="42" /></div>
        <p className="confirmation-payment-status" role="status">Pagamento aprovado</p>
        <h1 id="confirmation-title">Agendamento confirmado!</h1>
        <p className="confirmation-intro">Sua sala foi reservada com sucesso.</p>

        <dl className="confirmation-details" aria-label="Detalhes do agendamento">
          <div><dt><MapPinIcon width="19" height="19" /><span>Local</span></dt><dd>{confirmation.roomName} · {confirmation.unitName}</dd></div>
          <div><dt><CalendarIcon width="19" height="19" /><span>Data</span></dt><dd>{formatDisplayDate(confirmation.date)}</dd></div>
          <div><dt><ClockIcon width="19" height="19" /><span>Horário</span></dt><dd>{confirmation.timeSlot} ({formatDuration(confirmation.duration)})</dd></div>
        </dl>

        <p className="confirmation-delivery-note">O envio automático da confirmação por e-mail e WhatsApp será habilitado após a integração desses serviços.</p>

        <div className="confirmation-actions">
          <Link to="/meus-agendamentos" className="btn btn-primary">Ver meus agendamentos</Link>
          <Link to="/unidades" className="btn confirmation-secondary-action">Fazer novo agendamento</Link>
        </div>
      </section>
    </main>
  );
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(year, month - 1, day));
}

function formatDuration(duration: number) {
  return `${duration} ${duration === 1 ? 'hora' : 'horas'}`;
}
