export type UserRole = 'client' | 'admin' | 'secretaria';

export interface User {
  version?: string;
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

export interface ManagedUser extends User { version: string; }
export interface ManagedUsersSummary { total: number; active: number; inactive: number; admin: number; client: number; secretaria: number; }
export interface ManagedUsersQuery { search?: string; role?: UserRole; active?: boolean; page: number; pageSize: number; }
export interface ManagedUsersPage { items: ManagedUser[]; page: number; pageSize: number; total: number; summary: ManagedUsersSummary; }

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
  version?: string;
  imageId?: string | null;
  id: string;
  name: string;
  address: string;
  availableRooms: number;
  imageUrl: string | null;
  description?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUnitInput {
  imageId?: string | null;
  requestId?: string;
  name: string;
  address: string;
  description?: string;
  imageUrl: string | null;
  latitude?: number;
  longitude?: number;
}

export type UpdateUnitInput = CreateUnitInput;

export interface Room {
  imageIds?: string[];
  imageCardUrls?: string[];
  version?: string;
  images?: { id: string; url: string }[];
  unitName?: string;
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
  imageIds?: string[];
  requestId?: string;
  unitId: string;
  name: string;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
  imageUrl: string | null;
  imageUrls?: string[];
}

export type UpdateRoomInput = CreateRoomInput;

export type BusinessServiceKind = 'fiscal_address' | 'commercial_address' | 'hours_plan';

export interface BusinessService {
  version?: string;
  imageId?: string | null;
  id: string;
  kind: BusinessServiceKind;
  name: string;
  description: string;
  primaryFeatures: string[];
  secondaryFeatures: string[];
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateBusinessServiceInput = Omit<BusinessService, 'id' | 'createdAt' | 'updatedAt' | 'version'> & { requestId?: string };
export type UpdateBusinessServiceInput = CreateBusinessServiceInput;

export type BookingStatus = 'upcoming' | 'past' | 'cancelled';
export type BookingAdminStatus = 'pending' | 'confirmed' | 'cancelled';
export type BookingPaymentStatus = 'pending' | 'completed';

export interface Booking {
  version?: string;
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
  version?: string;
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
  requestId?: string;
  title: string;
  description?: string;
  assignedTo?: string;
  priority: TaskPriority;
  dueDate?: string;
  createdBy: string;
  status?: TaskStatus;
}

export interface TaskStaff { id: string; name: string; }
export interface TaskBoardQuery { page: number; pageSize: number; ownership: 'all' | 'mine'; }
export interface TaskBoardPage { items: Task[]; total: number; page: number; pageSize: number; counts: Record<TaskStatus, number>; }

export type UpdateTaskInput = Pick<Task, 'title' | 'description' | 'assignedTo' | 'priority' | 'dueDate'>;

export type AuditAction = 'create' | 'update' | 'delete' | 'cancel' | 'confirm' | 'check_in' | 'renew' | 'import';
export type AuditEntity = 'user' | 'unit' | 'room' | 'business_service' | 'booking' | 'task' | 'hours_plan' | 'backup';

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
    businessServices?: BusinessService[];
    bookings: Booking[];
    tasks: Task[];
    auditLogs: AuditLog[];
    hoursPlanTransactions: HoursPlanTransaction[];
  };
}

export interface AdminBookingRecord { booking: Booking; clientName: string; roomName: string; unitName: string; total?: number; adminStatus: BookingAdminStatus; }
export interface AdminBookingsQuery { page: number; pageSize: number; search?: string; unitId?: string; status?: BookingAdminStatus; dateFrom?: string; dateTo?: string; operational?: string; period?: string; }
export interface AdminBookingsSummary { total: number; confirmed: number; pending: number; cancelled: number; today: number; checkInsToday: number; revenue?: number; }
export interface AdminBookingsPage { items: AdminBookingRecord[]; total: number; page: number; pageSize: number; summary: AdminBookingsSummary; today: string; serverNow: string; }
export interface AdminDailyBookings { agenda: AdminBookingsPage; counts: { present: number; payments: number; waiting: number; today: number; checkIns: number }; firstPayment: AdminBookingRecord|null; firstWaiting: AdminBookingRecord|null; nextArrival: AdminBookingRecord|null; upcomingDays: Array<{date: string;count: number}>; }
export interface AdminBookingInput { requestId: string; clientId: string; roomId: string; date: string; timeSlot: string; total: string; paymentStatus: BookingPaymentStatus; }
export type AdminClientOption = Pick<User,'id'|'name'|'email'>;
