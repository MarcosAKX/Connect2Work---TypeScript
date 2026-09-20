import type { AdminBookingItem } from '../../hooks/useAdminDashboard';
import { CalendarIcon } from '../icons';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`));
}

function splitTimeSlot(value: string) {
  const [start = value, end = ''] = value.split(' - ');
  return { start, end };
}

export function BookingList({ bookings, emptyMessage, showDate = false }: { bookings: AdminBookingItem[]; emptyMessage: string; showDate?: boolean }) {
  if (bookings.length === 0) return <p className="admin-schedule__empty">{emptyMessage}</p>;
  return <ul className={`admin-booking-list${showDate ? ' is-upcoming' : ' is-today'}`}>{bookings.slice(0, 4).map((booking) => {
    const { start, end } = splitTimeSlot(booking.timeSlot);
    const status = booking.checkedInAt ? 'Em andamento' : booking.adminStatus === 'pending' ? 'Pendente' : 'Confirmado';
    return <li key={booking.id}>
      <div className="admin-booking-list__when">{showDate ? <><CalendarIcon width="21" height="21" /><span><strong>{formatDate(booking.date)}</strong><small>{start}</small></span></> : <><i aria-hidden="true" /><span><strong>{start}</strong><small>{end}</small></span></>}</div>
      <div className="admin-booking-list__subject"><strong>{booking.roomName}</strong><span>{booking.userName}</span></div>
      <div className="admin-booking-list__place"><i aria-hidden="true" /><span><strong>{booking.roomName}</strong><small>{booking.unitName}</small></span></div>
      <span className={`admin-booking-status is-${booking.checkedInAt ? 'active' : booking.adminStatus}`}>{status}</span>
    </li>;
  })}</ul>;
}
