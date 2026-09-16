import { ClockIcon, SunIcon, SunsetIcon } from '../icons';
import type { BookingViewModel } from '../../hooks/useBooking';

type Props = Pick<BookingViewModel, 'slots' | 'duration' | 'selectTimeSlot'>;
export function BookingTimeSlots({ slots, duration, selectTimeSlot }: Props) {
  const timeButtons = slots.map((slot) => (
    <button
      key={slot.index}
      type="button"
      className={`time-button${slot.selected ? ' is-selected' : ''}${slot.unavailable ? ' is-unavailable' : ''}`}
      disabled={slot.unavailable}
      aria-pressed={slot.selected}
      onClick={() => selectTimeSlot(slot.index)}
    >
      {slot.label}
    </button>
  ));
  return (
    <section className="booking-selection card">
      <div className="booking-section-title">
        <ClockIcon width="20" height="20" />
        <h2>Selecione o Horário</h2>
      </div>
      <p className="time-instruction" id="time-instruction">
        Selecione um ou mais intervalos consecutivos.
      </p>
      <div className="time-period">
        <h3>
          <SunIcon width="18" height="18" />
          Manhã
        </h3>
        <div className="time-grid" aria-describedby="time-instruction">
          {timeButtons.slice(0, 4)}
        </div>
      </div>
      <div className="time-period">
        <h3>
          <SunsetIcon width="18" height="18" />
          Tarde
        </h3>
        <div className="time-grid">{timeButtons.slice(4)}</div>
      </div>
      <div className="booking-duration">
        <ClockIcon width="20" height="20" />
        <span>
          Duração selecionada:{' '}
          <strong>
            {duration
              ? `${duration} ${duration === 1 ? 'hora' : 'horas'}`
              : 'nenhuma'}
          </strong>
        </span>
      </div>
    </section>
  );
}
