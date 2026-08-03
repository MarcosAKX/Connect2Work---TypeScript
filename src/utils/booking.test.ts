import { describe, expect, it } from 'vitest';
import { bookingHasConflict, canCancelBooking, getEffectiveBookingStatus, hourIsUnavailable, parseTimeSlot } from './booking';
import type { Booking } from '../types/domain';

const booking: Booking = { id: 'booking-1', userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-08-10', timeSlot: '09:00 - 11:00', status: 'upcoming', createdAt: '2026-08-01T00:00:00.000Z' };

describe('booking rules', () => {
  it('interpreta intervalos e bloqueia horas sobrepostas', () => {
    expect(parseTimeSlot('09:00 - 11:00')).toEqual({ start: 540, end: 660 });
    expect(hourIsUnavailable([booking], booking.roomId, new Date(2026, 7, 10), 1)).toBe(true);
    expect(hourIsUnavailable([booking], booking.roomId, new Date(2026, 7, 10), 3)).toBe(false);
  });

  it('ignora reserva cancelada', () => {
    expect(hourIsUnavailable([{ ...booking, status: 'cancelled' }], booking.roomId, new Date(2026, 7, 10), 1)).toBe(false);
  });

  it('bloqueia horários que já começaram no dia atual', () => {
    const now = new Date(2026, 7, 10, 9, 30);
    expect(hourIsUnavailable([], booking.roomId, new Date(2026, 7, 10), 1, now)).toBe(true);
    expect(hourIsUnavailable([], booking.roomId, new Date(2026, 7, 10), 2, now)).toBe(false);
  });
});

describe('bookingHasConflict', () => {
  it('detecta sobreposição do rascunho e ignora reserva cancelada', () => {
    const base = { id: '1', userId: 'u1', unitId: 'unit-1', roomId: 'room-1', date: '2026-08-10', createdAt: '2026-01-01T00:00:00.000Z' };
    expect(bookingHasConflict([{ ...base, timeSlot: '10:00 - 12:00', status: 'upcoming' }], 'room-1', '2026-08-10', '11:00 - 13:00')).toBe(true);
    expect(bookingHasConflict([{ ...base, timeSlot: '10:00 - 12:00', status: 'cancelled' }], 'room-1', '2026-08-10', '11:00 - 13:00')).toBe(false);
  });
});

describe('cancelamento', () => {
  const now = new Date(2026, 6, 16, 10, 0);

  it('permite exatamente 24 horas antes e bloqueia abaixo do limite', () => {
    expect(canCancelBooking({ ...booking, date: '2026-07-17', timeSlot: '10:00 - 11:00' }, now)).toBe(true);
    expect(canCancelBooking({ ...booking, date: '2026-07-17', timeSlot: '09:59 - 11:00' }, now)).toBe(false);
  });

  it('transforma reserva iniciada em passada e preserva cancelada', () => {
    expect(getEffectiveBookingStatus({ ...booking, date: '2026-07-16', timeSlot: '10:00 - 11:00' }, now)).toBe('past');
    expect(getEffectiveBookingStatus({ ...booking, status: 'cancelled' }, now)).toBe('cancelled');
  });
});
