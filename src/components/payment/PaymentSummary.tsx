import type { CheckoutDraft, Room, Unit } from '../../types/domain';
import type { PaymentViewModel } from '../../hooks/usePayment';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
type PaymentSummaryProps = Pick<PaymentViewModel, 'error' | 'isPaying' | 'hasConflict'> & {
  activeDraft: CheckoutDraft;
  room: Room;
  unit: Unit;
};

export function PaymentSummary({ activeDraft, room, unit, error, isPaying, hasConflict }: PaymentSummaryProps) {
  return (
        <aside className="payment-summary card" aria-labelledby="payment-summary-heading">
          <h2 id="payment-summary-heading">Resumo</h2>
          <dl className="payment-summary__list">
            <SummaryRow label="Sala" value={room.name} />
            <SummaryRow label="Unidade" value={unit.name} />
            <SummaryRow label="Data" value={formatDisplayDate(activeDraft.date)} />
            <SummaryRow label="Horário" value={activeDraft.timeSlot} />
            <SummaryRow label="Duração" value={`${activeDraft.duration} ${activeDraft.duration === 1 ? 'hora' : 'horas'}`} />
            {activeDraft.hoursFromPlan ? <SummaryRow label="Plano de horas" value={`${activeDraft.hoursFromPlan}h cobertas · ${activeDraft.hoursToPay ?? 0}h a pagar`} /> : null}
          </dl>
          <div className="payment-summary__total"><span>Total</span><strong>{currency.format(activeDraft.total)}</strong></div>
          {error && <p className="payment-error" role="alert">{error}</p>}
          <button type="submit" className={`btn btn-primary payment-submit${isPaying ? ' is-loading' : ''}`} disabled={isPaying || hasConflict}>
            <span className="btn-label">Pagar {currency.format(activeDraft.total)}</span><span className="btn-spinner" aria-hidden="true" />
          </button>
          <p className="payment-summary__terms">Ao confirmar, você concorda com os termos de uso. Pagamento apenas demonstrativo.</p>
        </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="payment-summary__row"><dt>{label}</dt><dd>{value}</dd></div>;
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
}
