import { describe, expect, it } from 'vitest';
import { canViewBookingValue } from './admin-bookings-visibility';

describe('canViewBookingValue', () => {
  it('oculta o valor para a secretaria', () => {
    expect(canViewBookingValue('secretaria')).toBe(false);
  });

  it('mantém o valor visível para o administrador', () => {
    expect(canViewBookingValue('admin')).toBe(true);
  });
});
