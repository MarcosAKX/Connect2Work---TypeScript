export type UserRole = 'client' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  profession?: string;
  phone?: string;
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
}

export type BookingStatus = 'upcoming' | 'past' | 'cancelled';

export interface Booking {
  id: string;
  userId: string;
  unitId: string;
  roomId: string;
  date: string;
  timeSlot: string;
  status: BookingStatus;
  createdAt: string;
  cancelledAt?: string;
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
}

export interface PaymentConfirmation {
  bookingId: string;
  roomName: string;
  unitName: string;
  date: string;
  timeSlot: string;
  duration: number;
}
