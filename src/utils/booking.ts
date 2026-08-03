import type { Booking, User } from '../types/domain';

export interface HoursPlanUsage {
  hoursFromPlan: number;
  hoursToPay: number;
  amountToPay: number;
}

export function isHoursPlanExpired(user: Pick<User, 'hasHoursPlan' | 'hoursPlanRenewsOn' | 'hoursPlanPaymentConfirmed'>, today = formatStorageDate(new Date())) {
  // A confirmação vale até a data do próximo ciclo; ao ultrapassá-la, a nova renovação volta a ficar pendente.
  return Boolean(user.hasHoursPlan && user.hoursPlanRenewsOn && user.hoursPlanRenewsOn < today);
}

export function calculateHoursPlanUsage(duration: number, pricePerHour: number, user: Pick<User, 'hasHoursPlan' | 'hoursBalance' | 'hoursPlanRenewsOn' | 'hoursPlanPaymentConfirmed'>, today = formatStorageDate(new Date())): HoursPlanUsage {
  const usableBalance = user.hasHoursPlan && !isHoursPlanExpired(user, today) ? Math.max(0, user.hoursBalance) : 0;
  const hoursFromPlan = Math.min(Math.max(0, duration), usableBalance);
  const hoursToPay = Math.max(0, duration - hoursFromPlan);
  return { hoursFromPlan, hoursToPay, amountToPay: hoursToPay * Math.max(0, pricePerHour) };
}

export const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'] as const;

export function formatStorageDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function timeToMinutes(time: string) {
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function addHours(time: string, amount: number) {
  const total = timeToMinutes(time) + amount * 60;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function parseTimeSlot(slot: string) {
  const match = slot.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
  return match?.[1] && match[2] ? { start: timeToMinutes(match[1]), end: timeToMinutes(match[2]) } : null;
}

export function hourIsUnavailable(
  bookings: Booking[],
  roomId: string,
  date: Date,
  hourIndex: number,
  now = new Date(),
) {
  const hour = HOURS[hourIndex];
  if (!hour) return true;
  const start = timeToMinutes(hour);
  const end = start + 60;
  const dateValue = formatStorageDate(date);
  const todayValue = formatStorageDate(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (dateValue < todayValue || (dateValue === todayValue && start <= currentMinutes)) return true;

  return bookings.some((booking) => {
    if (booking.roomId !== roomId || booking.date !== dateValue || booking.status === 'cancelled') return false;
    const range = parseTimeSlot(booking.timeSlot);
    return range ? start < range.end && end > range.start : false;
  });
}

export function bookingHasConflict(bookings: Booking[], roomId: string, date: string, timeSlot: string) {
  const requested = parseTimeSlot(timeSlot);
  if (!requested) return true;
  return bookings.some((booking) => {
    if (booking.roomId !== roomId || booking.date !== date || booking.status === 'cancelled') return false;
    const occupied = parseTimeSlot(booking.timeSlot);
    return occupied ? requested.start < occupied.end && requested.end > occupied.start : false;
  });
}

export function isPastDate(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()) < today;
}

export function isSameDate(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
}

export function getBookingStart(booking: Pick<Booking, 'date' | 'timeSlot'>) {
  const start = booking.timeSlot.match(/^(\d{2}):(\d{2})/) ?? [];
  const date = booking.date.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  if (!start[1] || !start[2] || !date[1] || !date[2] || !date[3]) return null;
  const value = new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]), Number(start[1]), Number(start[2]));
  return Number.isNaN(value.getTime()) ? null : value;
}

export function getEffectiveBookingStatus(booking: Booking, now = new Date()): Booking['status'] {
  if (booking.status === 'cancelled') return 'cancelled';
  const start = getBookingStart(booking);
  return start && start.getTime() <= now.getTime() ? 'past' : 'upcoming';
}

export function canCancelBooking(booking: Booking, now = new Date()) {
  if (getEffectiveBookingStatus(booking, now) !== 'upcoming') return false;
  const start = getBookingStart(booking);
  return Boolean(start && start.getTime() - now.getTime() >= 24 * 60 * 60 * 1000);
}
