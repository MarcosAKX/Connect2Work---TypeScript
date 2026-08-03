import type { Booking, User } from '../../types/domain';

export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  active: boolean;
  profession: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingRow {
  id: string;
  user_id: string;
  unit_id: string;
  room_id: string;
  booking_date: string;
  time_slot: string;
  status: Booking['status'];
  admin_status: Booking['adminStatus'] | null;
  payment_status: Booking['paymentStatus'] | null;
  total: number | null;
  hours_from_plan: number | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function profileRowToUser(row: ProfileRow, plan?: Pick<User, 'hasHoursPlan' | 'hoursBalance' | 'hoursPlanTotal' | 'hoursPlanRenewsOn' | 'hoursPlanPaymentConfirmed' | 'hoursPlanLastRenewalAt'>): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    profession: row.profession ?? undefined,
    phone: row.phone ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasHoursPlan: plan?.hasHoursPlan ?? false,
    hoursBalance: plan?.hoursBalance ?? 0,
    hoursPlanTotal: plan?.hoursPlanTotal,
    hoursPlanRenewsOn: plan?.hoursPlanRenewsOn,
    hoursPlanPaymentConfirmed: plan?.hoursPlanPaymentConfirmed,
    hoursPlanLastRenewalAt: plan?.hoursPlanLastRenewalAt,
  };
}

export function bookingRowToDomain(row: BookingRow): Booking {
  return {
    id: row.id,
    userId: row.user_id,
    unitId: row.unit_id,
    roomId: row.room_id,
    date: row.booking_date,
    timeSlot: row.time_slot,
    status: row.status,
    adminStatus: row.admin_status ?? undefined,
    paymentStatus: row.payment_status ?? undefined,
    total: row.total ?? undefined,
    hoursFromPlan: row.hours_from_plan ?? undefined,
    checkedInAt: row.checked_in_at ?? undefined,
    checkedInBy: row.checked_in_by ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
