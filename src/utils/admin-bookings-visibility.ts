import type { UserRole } from '../types/domain';

export function canViewBookingValue(role: UserRole | undefined): boolean {
  return role !== 'secretaria';
}
