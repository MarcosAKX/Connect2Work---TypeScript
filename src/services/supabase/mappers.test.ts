import { describe, expect, it } from 'vitest';
import { bookingRowToDomain, profileRowToUser, type BookingRow, type ProfileRow } from './mappers';

describe('Supabase mappers', () => {
  it('converte profile snake_case para domínio', () => {
    const row: ProfileRow = {
      id: crypto.randomUUID(), name: 'Cliente', email: 'cliente@example.com', role: 'client', active: true,
      profession: null, phone: null, created_at: '2026-08-03T12:00:00.000Z', updated_at: '2026-08-03T13:00:00.000Z',
    };
    expect(profileRowToUser(row)).toMatchObject({ id: row.id, createdAt: row.created_at, updatedAt: row.updated_at, hasHoursPlan: false, hoursBalance: 0 });
  });

  it('converte booking sem espalhar nomes do banco', () => {
    const row: BookingRow = {
      id: crypto.randomUUID(), user_id: crypto.randomUUID(), unit_id: crypto.randomUUID(), room_id: crypto.randomUUID(),
      booking_date: '2026-08-10', time_slot: '08:00 - 09:00', status: 'upcoming', admin_status: 'confirmed',
      payment_status: 'completed', total: 80, hours_from_plan: null, checked_in_at: null, checked_in_by: null,
      cancelled_at: null, cancellation_reason: null, created_at: '2026-08-03T12:00:00.000Z', updated_at: '2026-08-03T12:00:00.000Z',
    };
    expect(bookingRowToDomain(row)).toMatchObject({ userId: row.user_id, date: row.booking_date, timeSlot: row.time_slot, total: 80 });
    expect(bookingRowToDomain(row)).not.toHaveProperty('user_id');
  });
});
