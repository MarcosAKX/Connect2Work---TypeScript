import type { AuditLog, BackupPayload, Booking, BookingCounts, BookingStatus, CheckoutDraft, ClientSummary, CreateBookingInput, CreateManagedUserInput, CreateRoomInput, CreateTaskInput, CreateUnitInput, HoursPlanTransaction, RegisterInput, Room, Task, TaskStatus, Unit, UpdateManagedUserInput, UpdateRoomInput, UpdateTaskInput, UpdateUnitInput, UpdateUserHoursPlanInput, User, UserRole } from '../types/domain';

export interface AuthGateway {
  getCurrentUser(): User | null;
  getUserById(id: string): Promise<User | null>;
  login(email: string, password: string): Promise<User>;
  loginWithGoogle(): Promise<User>;
  register(input: RegisterInput): Promise<User>;
  resetPassword(email: string): Promise<void>;
  logout(): Promise<void>;
}

export interface UserManagementGateway {
  listUsers(): Promise<User[]>;
  listUsersWithHoursPlanInfo(): Promise<User[]>;
  createUser(input: CreateManagedUserInput): Promise<User>;
  updateUser(id: string, input: UpdateManagedUserInput): Promise<User>;
  updateUserRole(id: string, role: UserRole): Promise<User>;
  updateUserStatus(id: string, active: boolean): Promise<User>;
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
  listTasks(): Promise<Task[]>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(id: string, input: UpdateTaskInput, actorUserId: string): Promise<Task>;
  updateTaskStatus(id: string, status: TaskStatus, actorUserId: string): Promise<Task>;
  deleteTask(id: string, actorUserId: string): Promise<void>;
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

export interface AppServices {
  auth: AuthGateway;
  users: UserManagementGateway;
  catalog: CatalogGateway;
  bookings: BookingGateway;
  checkout: CheckoutGateway;
  tasks: TaskGateway;
  audit: AuditGateway;
  backup: BackupGateway;
}
