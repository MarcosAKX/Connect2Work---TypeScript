import type { Booking, BookingCounts, BookingStatus, CheckoutDraft, CreateBookingInput, CreateUnitInput, RegisterInput, Room, Unit, UpdateUnitInput, User } from '../types/domain';

export interface AuthGateway {
  getCurrentUser(): User | null;
  getUserById(id: string): Promise<User | null>;
  login(email: string, password: string): Promise<User>;
  loginWithGoogle(): Promise<User>;
  register(input: RegisterInput): Promise<User>;
  resetPassword(email: string): Promise<void>;
  logout(): Promise<void>;
}

export interface CatalogGateway {
  getUnits(): Promise<Unit[]>;
  getUnitById(id: string): Promise<Unit | null>;
  createUnit(input: CreateUnitInput): Promise<Unit>;
  updateUnit(id: string, input: UpdateUnitInput): Promise<Unit>;
  deleteUnit(id: string): Promise<void>;
  getRoomsByUnitId(unitId: string): Promise<Room[]>;
  getRoomById(id: string): Promise<Room | null>;
}

export interface BookingGateway {
  getByUserAndStatus(userId: string, status: BookingStatus): Promise<Booking[]>;
  getCounts(userId: string): Promise<BookingCounts>;
  getAll(): Promise<Booking[]>;
  create(input: CreateBookingInput): Promise<Booking>;
  cancel(bookingId: string, userId: string): Promise<Booking>;
}

export interface CheckoutGateway {
  getDraft(): CheckoutDraft | null;
  saveDraft(draft: CheckoutDraft): void;
  clearDraft(): void;
}

export interface AppServices {
  auth: AuthGateway;
  catalog: CatalogGateway;
  bookings: BookingGateway;
  checkout: CheckoutGateway;
}
