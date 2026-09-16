import type { ReactNode } from 'react';
import { CalendarIcon, ClockIcon, DoorIcon } from '../icons';
import type { Room, Unit } from '../../types/domain';
import type { BookingViewModel } from '../../hooks/useBooking';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
type Props = Pick<
  BookingViewModel,
  | 'selectedDate'
  | 'selectedSlot'
  | 'duration'
  | 'planBalanceText'
  | 'planBalanceDescription'
  | 'total'
  | 'submitError'
  | 'canContinue'
  | 'continueLabel'
  | 'continueToPayment'
> & { room: Room; unit: Unit };

export function BookingSummary({
  room,
  unit,
  selectedDate,
  selectedSlot,
  duration,
  planBalanceText,
  planBalanceDescription,
  total,
  submitError,
  canContinue,
  continueLabel,
  continueToPayment,
}: Props) {
  return (
    <aside className="booking-summary card">
      <h2>Resumo do Agendamento</h2>
      <dl
        className="booking-summary__list"
        aria-live="polite"
        aria-atomic="true"
      >
        <SummaryRow
          icon={<DoorIcon width="23" height="23" />}
          value={room.name}
          secondary={unit.name}
        />
        <SummaryRow
          icon={<CalendarIcon width="23" height="23" />}
          value={
            selectedDate?.toLocaleDateString('pt-BR') ?? 'Selecione uma data'
          }
          secondary={selectedDate?.toLocaleDateString('pt-BR', {
            weekday: 'long',
          })}
        />
        <SummaryRow
          icon={<ClockIcon width="23" height="23" />}
          value={selectedSlot || 'Selecione o horário'}
          secondary={
            duration
              ? `${duration} ${duration === 1 ? 'hora' : 'horas'}`
              : undefined
          }
        />
        {planBalanceText && (
          <SummaryRow
            icon={<ClockIcon width="23" height="23" />}
            value={planBalanceText}
            secondary={planBalanceDescription}
          />
        )}
      </dl>
      <div className="booking-summary__total">
        <span>Total</span>
        <strong>{currency.format(total)}</strong>
      </div>
      {submitError && (
        <p className="booking-submit-error" role="alert">
          {submitError}
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary booking-summary__button"
        disabled={!canContinue}
        onClick={continueToPayment}
      >
        {continueLabel}
      </button>
      <p className="booking-summary__notice">
        Sua reserva será confirmada após a conclusão desta etapa.
      </p>
    </aside>
  );
}

function SummaryRow({
  icon,
  value,
  secondary,
}: {
  icon: ReactNode;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="booking-summary__row">
      <dt aria-hidden="true">{icon}</dt>
      <dd>
        <strong>{value}</strong>
        {secondary && <span>{secondary}</span>}
      </dd>
    </div>
  );
}
