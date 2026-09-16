import { CalendarIcon } from '../icons';
import type { BookingViewModel } from '../../hooks/useBooking';
import { formatStorageDate, isPastDate, isSameDate } from '../../utils/booking';

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
type Props = Pick<
  BookingViewModel,
  'visibleMonth' | 'selectedDate' | 'setVisibleMonth' | 'selectDate'
>;

export function BookingCalendar({
  visibleMonth,
  selectedDate,
  setVisibleMonth,
  selectDate,
}: Props) {
  const days = calendarDays(visibleMonth);
  const currentMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );
  return (
    <section className="booking-selection card">
      <div className="booking-section-title">
        <CalendarIcon width="20" height="20" />
        <h2>Selecione a Data</h2>
      </div>
      <div className="calendar">
        <div className="calendar__header">
          <button
            type="button"
            className="calendar__navigation"
            aria-label="Mês anterior"
            disabled={visibleMonth <= currentMonth}
            onClick={() =>
              setVisibleMonth(
                new Date(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth() - 1,
                  1,
                ),
              )
            }
          >
            ‹
          </button>
          <h3>
            {visibleMonth.toLocaleDateString('pt-BR', {
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <button
            type="button"
            className="calendar__navigation"
            aria-label="Próximo mês"
            onClick={() =>
              setVisibleMonth(
                new Date(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth() + 1,
                  1,
                ),
              )
            }
          >
            ›
          </button>
        </div>
        <div className="calendar__weekdays" aria-hidden="true">
          {weekdays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar__days" role="grid" aria-label="Dias do mês">
          {days.map((date, index) =>
            date ? (
              <button
                key={formatStorageDate(date)}
                type="button"
                className={`calendar__day${isSameDate(date, new Date()) ? ' is-today' : ''}${selectedDate && isSameDate(date, selectedDate) ? ' is-selected' : ''}`}
                disabled={isPastDate(date)}
                aria-label={date.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
                aria-pressed={Boolean(
                  selectedDate && isSameDate(date, selectedDate),
                )}
                onClick={() => selectDate(date)}
              >
                {date.getDate()}
              </button>
            ) : (
              <span
                key={`empty-${index}`}
                className="calendar__day calendar__day--empty"
                aria-hidden="true"
              />
            ),
          )}
        </div>
        <p className="selected-date">
          Data selecionada:{' '}
          <strong>
            {selectedDate
              ? selectedDate.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              : 'nenhuma'}
          </strong>
        </p>
      </div>
    </section>
  );
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const total = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const result: Array<Date | null> = Array.from(
    { length: first.getDay() },
    () => null,
  );
  for (let day = 1; day <= total; day += 1)
    result.push(new Date(month.getFullYear(), month.getMonth(), day));
  return result;
}
