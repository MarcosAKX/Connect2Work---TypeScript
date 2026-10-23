import { ClockIcon, SunIcon, SunsetIcon } from '../../components/icons';
import type { BookingViewModel } from './useBooking';

type Props = Pick<BookingViewModel, 'slots' | 'duration' | 'selectTimeSlot' | 'availabilityLoading' | 'availabilityError' | 'retryAvailability' | 'isSaving'>;
export function BookingTimeSlots({ slots, duration, selectTimeSlot, availabilityLoading, availabilityError, retryAvailability, isSaving }: Props) {
  const timeButtons = slots.map((slot) => (
    <button
      key={slot.index}
      type="button"
      className={`time-button${slot.selected ? ' is-selected' : ''}${slot.unavailable ? ' is-unavailable' : ''}`}
      disabled={slot.unavailable || isSaving}
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
      {availabilityLoading && <p role="status">Consultando horários disponíveis...</p>}
      {availabilityError && <div role="alert"><p>{availabilityError}</p><button type="button" className="btn btn-secondary" onClick={retryAvailability} disabled={isSaving}>Tentar novamente</button></div>}
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
