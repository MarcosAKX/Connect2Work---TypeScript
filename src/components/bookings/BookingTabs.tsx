import { useRef, type KeyboardEvent } from 'react';
import type { BookingStatus } from '../../types/domain';
import type { BookingsViewModel } from '../../hooks/useBookings';

const statuses: BookingStatus[] = ['upcoming', 'past', 'cancelled'];
const labels: Record<BookingStatus, string> = { upcoming: 'Próximos', past: 'Passados', cancelled: 'Cancelados' };

type BookingTabsProps = Pick<BookingsViewModel, 'status' | 'setStatus' | 'counts'>;

export function BookingTabs({ status, setStatus, counts }: BookingTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + statuses.length) % statuses.length;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % statuses.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = statuses.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextStatus = statuses[nextIndex];
    if (!nextStatus) return;
    setStatus(nextStatus);
    tabRefs.current[nextIndex]?.focus();
  }


  return (
      <div className="bookings-tabs" role="tablist" aria-label="Filtrar agendamentos">
        {statuses.map((item, index) => (
          <button
            key={item}
            ref={(element) => { tabRefs.current[index] = element; }}
            type="button"
            className={`bookings-tab${status === item ? ' is-active' : ''}`}
            role="tab"
            aria-selected={status === item}
            tabIndex={status === item ? 0 : -1}
            onClick={() => setStatus(item)}
            onKeyDown={(event) => handleTabKey(event, index)}
          >
            {labels[item]} <span className="bookings-tab__count">({counts[item]})</span>
          </button>
        ))}
      </div>
  );
}
