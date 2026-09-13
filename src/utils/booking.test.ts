import { describe, expect, it } from 'vitest';
import { bookingHasConflict, calculateHoursPlanUsage, canCancelBooking, getEffectiveBookingStatus, hourIsUnavailable, isHoursPlanExpired, parseTimeSlot } from './booking';
import type { Booking } from '../types/domain';

const booking: Booking = { id: 'booking-1', userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-08-10', timeSlot: '09:00 - 11:00', status: 'upcoming', createdAt: '2026-08-01T00:00:00.000Z' };

describe('booking rules', () => {
  const beforeBooking = new Date(2026, 7, 9, 12);
  it('interpreta intervalos e bloqueia horas sobrepostas', () => {
    expect(parseTimeSlot('09:00 - 11:00')).toEqual({ start: 540, end: 660 });
    expect(hourIsUnavailable([booking], booking.roomId, new Date(2026, 7, 10), 1, beforeBooking)).toBe(true);
    expect(hourIsUnavailable([booking], booking.roomId, new Date(2026, 7, 10), 3, beforeBooking)).toBe(false);
  });

  it('ignora reserva cancelada', () => {
    expect(hourIsUnavailable([{ ...booking, status: 'cancelled' }], booking.roomId, new Date(2026, 7, 10), 1, beforeBooking)).toBe(false);
  });

  it('bloqueia datas passadas mesmo sem reservas ou com reserva cancelada', () => {
    const now = new Date(2026, 7, 11, 8);
    const date = new Date(2026, 7, 10);
    expect(hourIsUnavailable([], booking.roomId, date, 1, now)).toBe(true);
    expect(hourIsUnavailable([{ ...booking, status: 'cancelled' }], booking.roomId, date, 1, now)).toBe(true);
  });

  it('bloqueia no instante de início mesmo após cancelamento', () => {
    const now = new Date(2026, 7, 10, 9);
    expect(hourIsUnavailable([{ ...booking, status: 'cancelled' }], booking.roomId, new Date(2026, 7, 10), 1, now)).toBe(true);
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

describe('plano de horas', () => {
  const activePlan = { hasHoursPlan: true, hoursBalance: 3, hoursPlanRenewsOn: '2026-09-01', hoursPlanPaymentConfirmed: true };

  it('divide saldo e valor excedente', () => {
    expect(calculateHoursPlanUsage(5, 80, activePlan, '2026-08-01')).toEqual({ hoursFromPlan: 3, hoursToPay: 2, amountToPay: 160 });
    expect(calculateHoursPlanUsage(2, 80, activePlan, '2026-08-01')).toEqual({ hoursFromPlan: 2, hoursToPay: 0, amountToPay: 0 });
  });

  it('bloqueia consumo após a renovação esperada', () => {
    expect(isHoursPlanExpired(activePlan, '2026-09-02')).toBe(true);
    expect(calculateHoursPlanUsage(2, 80, activePlan, '2026-09-02')).toEqual({ hoursFromPlan: 0, hoursToPay: 2, amountToPay: 160 });
  });
});
