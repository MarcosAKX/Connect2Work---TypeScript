import type { AuditLog, BackupPayload, Booking, BookingCounts, BookingStatus, BusinessService, CheckoutDraft, ClientSummary, CreateBookingInput, CreateBusinessServiceInput, CreateManagedUserInput, CreateRoomInput, CreateTaskInput, CreateUnitInput, HoursPlanTransaction, RegisterInput, Room, Task, TaskStatus, TaskBoardQuery, TaskBoardPage, TaskStaff, Unit, UpdateBusinessServiceInput, UpdateManagedUserInput, UpdateRoomInput, UpdateTaskInput, UpdateUnitInput, UpdateUserHoursPlanInput, User, UserRole } from '../types/domain';

export interface AuthSession { user: User; idleExpiresAt: string; absoluteExpiresAt: string; clockOffsetMs?: number; }

export interface AuthGateway {
  readonly mode: 'mock' | 'http';
  restoreSession(): Promise<AuthSession | null>;
  recordActivity(): Promise<AuthSession | null>;
  onSessionExpired(listener: () => void): () => void;
  getCurrentUser(): User | null;
  getUserById(id: string): Promise<User | null>;
  login(email: string, password: string): Promise<User>;
  loginWithGoogle(): Promise<User>;
  register(input: RegisterInput): Promise<User>;
  resetPassword(email: string): Promise<void>;
  logout(): Promise<void>;
}

export interface UserManagementGateway {
  listUsersPage(query: import('../types/domain').ManagedUsersQuery): Promise<import('../types/domain').ManagedUsersPage>;
  listUsers(): Promise<User[]>;
  listUsersWithHoursPlanInfo(): Promise<User[]>;
  createUser(input: CreateManagedUserInput): Promise<User>;
  updateUser(id: string, input: UpdateManagedUserInput, expectedVersion?: string): Promise<User>;
  updateUserRole(id: string, role: UserRole, expectedVersion?: string): Promise<User>;
  updateUserStatus(id: string, active: boolean, expectedVersion?: string): Promise<User>;
  searchClients(query: string): Promise<ClientSummary[]>;
  updateUserHoursPlan(userId: string, input: UpdateUserHoursPlanInput): Promise<User>;
  confirmHoursPlanRenewal(userId: string): Promise<User>;
}

export interface CatalogGateway {
  getUnits(): Promise<Unit[]>;
  getUnitById(id: string): Promise<Unit | null>;
  createUnit(input: CreateUnitInput): Promise<Unit>;
  updateUnit(id: string, input: UpdateUnitInput): Promise<Unit>;
  deleteUnit(id: string): Promise<void>;
  getRoomsByUnitId(unitId: string): Promise<Room[]>;
  getRoomById(id: string): Promise<Room | null>;
  createRoom(input: CreateRoomInput): Promise<Room>;
  updateRoom(id: string, input: UpdateRoomInput): Promise<Room>;
  deleteRoom(id: string): Promise<void>;
}

export interface BookingGateway {
  getByUserAndStatus(userId: string, status: BookingStatus): Promise<Booking[]>;
  getCounts(userId: string): Promise<BookingCounts>;
  getAll(): Promise<Booking[]>;
  create(input: CreateBookingInput): Promise<Booking>;
  cancel(bookingId: string, userId: string): Promise<Booking>;
  confirmBooking(bookingId: string): Promise<Booking>;
  confirmPayment(bookingId: string): Promise<Booking>;
  checkInBooking(bookingId: string, staffUserId: string): Promise<Booking>;
  cancelBookingAsAdmin(bookingId: string, reason: string): Promise<Booking>;
}

export interface CheckoutGateway {
  getDraft(): CheckoutDraft | null;
  saveDraft(draft: CheckoutDraft): void;
  clearDraft(): void;
}

export interface TaskGateway {
  listBoard?(query: TaskBoardQuery): Promise<TaskBoardPage>;
  listStaff?(): Promise<TaskStaff[]>;
  attentionCount?(): Promise<number>;
  listTasks(): Promise<Task[]>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(id: string, input: UpdateTaskInput, actorUserId: string, expectedVersion?: string): Promise<Task>;
  updateTaskStatus(id: string, status: TaskStatus, actorUserId: string, expectedVersion?: string): Promise<Task>;
  deleteTask(id: string, actorUserId: string, expectedVersion?: string): Promise<void>;
}

export interface BusinessServiceGateway {
  listServices(options?: { includeInactive?: boolean }): Promise<BusinessService[]>;
  createService(input: CreateBusinessServiceInput): Promise<BusinessService>;
  updateService(id: string, input: UpdateBusinessServiceInput, expectedVersion?: string): Promise<BusinessService>;
  deleteService(id: string): Promise<void>;
}

export interface AuditGateway {
  listRecent(actorUserId: string, limit?: number): Promise<AuditLog[]>;
  listHoursPlanTransactions(userId: string, actorUserId: string): Promise<HoursPlanTransaction[]>;
}

export interface BackupGateway {
  exportData(actorUserId: string): Promise<BackupPayload>;
  importData(payload: BackupPayload, actorUserId: string): Promise<void>;
  getLastBackupAt(actorUserId: string): Promise<string | null>;
}

export interface AdminBookingsGateway {
 list(query: import('../types/domain').AdminBookingsQuery): Promise<import('../types/domain').AdminBookingsPage>;
 daily(query: import('../types/domain').AdminBookingsQuery): Promise<import('../types/domain').AdminDailyBookings>;
 create(input: import('../types/domain').AdminBookingInput): Promise<import('../types/domain').AdminBookingRecord>;
 action(id: string,action: 'confirmacao'|'pagamento'|'cancelamento'|'chegada',expectedVersion: string,reason?: string): Promise<import('../types/domain').AdminBookingRecord>;
 searchClients(search: string): Promise<import('../types/domain').AdminClientOption[]>;
}
export interface AppServices {
  adminBookings?: AdminBookingsGateway;
  adminCatalog?: AdminCatalogGateway;
  images?: ImageGateway;
  auth: AuthGateway;
  users: UserManagementGateway;
  catalog: CatalogGateway;
  bookings: BookingGateway;
  checkout: CheckoutGateway;
  businessServices: BusinessServiceGateway;
  tasks: TaskGateway;
  audit: AuditGateway;
  backup: BackupGateway;
}
export interface CatalogQuery { page: number; pageSize: number; search?: string; unitId?: string; }
export interface CatalogPage<T> { items: T[]; total: number; page: number; pageSize: number; }
export interface ImageGateway { upload(file: File): Promise<{ id: string; expiresAt: string }>; }
export interface AdminCatalogGateway {
  listUnits(query: CatalogQuery): Promise<CatalogPage<Unit>>;
  listRooms(query: CatalogQuery): Promise<CatalogPage<Room>>;
  unitOptions(search?: string): Promise<Pick<Unit, 'id' | 'name'>[]>;
  createUnit(input: CreateUnitInput): Promise<Unit>;
  updateUnit(id: string, input: UpdateUnitInput, version?: string): Promise<Unit>;
  deleteUnit(id: string, version?: string): Promise<void>;
  createRoom(input: CreateRoomInput): Promise<Room>;
  updateRoom(id: string, input: UpdateRoomInput, version?: string): Promise<Room>;
  deleteRoom(id: string, version?: string): Promise<void>;
}
