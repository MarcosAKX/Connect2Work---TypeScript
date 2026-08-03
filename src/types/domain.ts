export type UserRole = 'client' | 'admin' | 'secretaria';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  profession?: string;
  phone?: string;
  hasHoursPlan: boolean;
  hoursBalance: number;
  hoursPlanTotal?: number;
  hoursPlanRenewsOn?: string;
  hoursPlanPaymentConfirmed?: boolean;
  hoursPlanLastRenewalAt?: string;
}

export type ClientSummary = Pick<User, 'id' | 'name' | 'email' | 'hasHoursPlan' | 'hoursBalance' | 'hoursPlanTotal' | 'hoursPlanRenewsOn' | 'hoursPlanPaymentConfirmed'>;

export type UpdateUserHoursPlanInput = Pick<User, 'hasHoursPlan' | 'hoursBalance' | 'hoursPlanTotal' | 'hoursPlanRenewsOn'>;

export interface CreateManagedUserInput {
  name: string;
  email: string;
  profession?: string;
  phone?: string;
  password: string;
  role: UserRole;
  active: boolean;
}

export interface UpdateManagedUserInput extends Omit<CreateManagedUserInput, 'password'> {
  password?: string;
}

export interface StoredUser extends User {
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  profession: string;
  phone: string;
  password: string;
}

export interface Unit {
  id: string;
  name: string;
  address: string;
  availableRooms: number;
  imageUrl: string | null;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUnitInput {
  name: string;
  address: string;
  description?: string;
  imageUrl: string | null;
}

export type UpdateUnitInput = CreateUnitInput;

export interface Room {
  id: string;
  unitId: string;
  name: string;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
  imageUrl: string | null;
  imageUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRoomInput {
  unitId: string;
  name: string;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
  imageUrl: string | null;
  imageUrls?: string[];
}

export type UpdateRoomInput = CreateRoomInput;

export type BookingStatus = 'upcoming' | 'past' | 'cancelled';
export type BookingAdminStatus = 'pending' | 'confirmed' | 'cancelled';
export type BookingPaymentStatus = 'pending' | 'completed';

export interface Booking {
  id: string;
  userId: string;
  unitId: string;
  roomId: string;
  date: string;
  timeSlot: string;
  status: BookingStatus;
  adminStatus?: BookingAdminStatus;
  total?: number;
  paymentStatus?: BookingPaymentStatus;
  createdAt: string;
  updatedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  hoursFromPlan?: number;
}

export interface BookingCounts {
  upcoming: number;
  past: number;
  cancelled: number;
}

export type CreateBookingInput = Omit<Booking, 'id' | 'createdAt' | 'cancelledAt'>;

export interface CheckoutDraft {
  userId: string;
  unitId: string;
  roomId: string;
  date: string;
  timeSlot: string;
  duration: number;
  total: number;
  hoursFromPlan?: number;
  hoursToPay?: number;
}

export interface PaymentConfirmation {
  bookingId: string;
  roomName: string;
  unitName: string;
  date: string;
  timeSlot: string;
  duration: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: string;
  priority: TaskPriority;
  dueDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assignedTo?: string;
  priority: TaskPriority;
  dueDate?: string;
  createdBy: string;
  status?: TaskStatus;
}

export type UpdateTaskInput = Pick<Task, 'title' | 'description' | 'assignedTo' | 'priority' | 'dueDate'>;

export type AuditAction = 'create' | 'update' | 'delete' | 'cancel' | 'confirm' | 'check_in' | 'renew' | 'import';
export type AuditEntity = 'user' | 'unit' | 'room' | 'booking' | 'task' | 'hours_plan' | 'backup';

export interface AuditLog {
  id: string;
  actorUserId?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  occurredAt: string;
  actorName?: string;
  details?: Record<string, string | number | boolean | null>;
}

export type HoursPlanTransactionType = 'credit' | 'debit' | 'refund' | 'adjustment';

export interface HoursPlanTransaction {
  id: string;
  userId: string;
  bookingId?: string;
  type: HoursPlanTransactionType;
  hours: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  credentialsIncluded: false;
  data: {
    users: User[];
    units: Unit[];
    rooms: Room[];
    bookings: Booking[];
    tasks: Task[];
    auditLogs: AuditLog[];
    hoursPlanTransactions: HoursPlanTransaction[];
  };
}
