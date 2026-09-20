import { Navigate } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { PaymentPanel } from '../components/payment/PaymentPanel';
import { PaymentSummary } from '../components/payment/PaymentSummary';
import { usePayment } from '../hooks/usePayment';
import { useAuth } from '../state/AuthContext';

export function PaymentPage() {
  const { user } = useAuth();
  const model = usePayment(user);
  const { draft, room, unit } = model;
  if (!draft || !user || draft.userId !== user.id) return <Navigate to="/unidades" replace />;
  if (room === null || unit === null) return <Navigate to="/unidades" replace />;
  if (!room || !unit) return <main className="payment-page"><p>Carregando pagamento...</p></main>;

  return (
    <main className="payment-page">
      <BackLink to={`/agendamento?sala=${encodeURIComponent(room.id)}`} label="Voltar para agendamento" />
      <form className="payment-layout" onSubmit={model.confirmPayment} noValidate>
        <PaymentPanel
          method={model.method} card={model.card} copyStatus={model.copyStatus}
          copyPixCode={model.copyPixCode} updateCard={model.updateCard} selectMethod={model.selectMethod}
        />
        <PaymentSummary
          activeDraft={draft} room={room} unit={unit}
          error={model.error} isPaying={model.isPaying} hasConflict={model.hasConflict}
        />
      </form>
    </main>
  );
}
