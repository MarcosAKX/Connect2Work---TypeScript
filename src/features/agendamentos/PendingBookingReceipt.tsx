import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '../../components/icons';
import type { Booking, Room, Unit } from '../../types/domain';
import { PaymentPanel } from '../pagamentos/PaymentPanel';
import { PaymentSummary } from '../pagamentos/PaymentSummary';
import { BookingCompletion } from '../pagamentos/PaymentConfirmationPage';
import type { PaymentMethod } from '../pagamentos/payment';

// Mesmos componentes visuais do pagamento anterior; sem cobrança nem coleta de cartão.
export function PendingBookingReceipt({ booking, room, unit, onNewSelection }: { booking: Booking; room: Room; unit: Unit; onNewSelection: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [complete, setComplete] = useState(false);
  useEffect(() => { window.scrollTo({ top: 0, left: 0 }); }, [booking.id]);
  const cancelled = booking.adminStatus === 'cancelled';
  const ended = booking.status === 'past';
  const hours = booking.timeSlot.split(' - ').map(time => Number(time.slice(0, 2)));
  const duration = (hours[1] ?? 0) - (hours[0] ?? 0);
  const confirmation = { bookingId: booking.id, roomName: room.name, unitName: unit.name, date: booking.date, timeSlot: booking.timeSlot, duration };
  if (complete || cancelled || ended) return <BookingCompletion
    confirmation={confirmation}
    title={cancelled ? 'Agendamento cancelado' : ended ? 'Período encerrado' : 'Agendamento solicitado!'}
    status={cancelled ? 'Cancelado' : ended ? 'Período encerrado' : booking.adminStatus === 'confirmed' ? 'Confirmado' : 'Pendente de confirmação'}
    intro={cancelled ? 'Este protocolo corresponde a uma reserva cancelada. Nenhuma nova reserva foi criada.' : ended ? 'Este protocolo corresponde a um período já encerrado. Nenhuma nova reserva foi criada.' : booking.adminStatus === 'confirmed' ? 'A equipe confirmou sua reserva.' : 'Sua solicitação foi registrada. Aguarde a confirmação da equipe.'}
    note="Nenhum pagamento foi realizado nesta etapa."
    protocol={booking.id}
    primaryTo={`/salas?unidade=${encodeURIComponent(unit.id)}`}
    primaryLabel="Voltar às salas"
    onNewSelection={onNewSelection}
  />;
  return <main className="payment-page">
    <Link to={`/agendamento?sala=${encodeURIComponent(room.id)}`} className="page-back" onClick={event => { event.preventDefault(); onNewSelection(); }}><ArrowLeftIcon width="16" height="16" />Voltar para agendamento</Link>
    <form className="payment-layout" onSubmit={event => { event.preventDefault(); setComplete(true); window.scrollTo({ top: 0, left: 0 }); }}>
      <PaymentPanel method={method} card={{ holder: '', number: '', expiry: '', cvv: '' }} copyStatus="" copyPixCode={async () => {}} updateCard={() => {}} selectMethod={setMethod} paymentReady={false} />
      <PaymentSummary activeDraft={{ userId: booking.userId, unitId: unit.id, roomId: room.id, date: booking.date, timeSlot: booking.timeSlot, duration, total: booking.total ?? 0 }} room={room} unit={unit} error="" isPaying={false} hasConflict={false} paymentReady={false} reservation={booking} />
    </form>
  </main>;
}
