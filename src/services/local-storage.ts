import type { AppServices } from './contracts';
import { rooms, units } from './mock-data';
import type { Booking, BookingStatus, CheckoutDraft, StoredUser, User } from '../types/domain';
import { canCancelBooking, getEffectiveBookingStatus } from '../utils/booking';

const KEYS = {
  users: 'c2w_mock_users',
  session: 'c2w_mock_session',
  bookings: 'c2w_mock_bookings',
  resets: 'c2w_mock_password_resets',
  checkout: 'c2w_checkout_draft',
} as const;

const seedUser: StoredUser = {
  id: 'seed-usuario-teste',
  name: 'Usuário Teste',
  email: 'teste@connect2work.com',
  password: '123456',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function readArray<T>(key: string): T[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

function readObject<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function ensureSeedUser() {
  const users = readArray<StoredUser>(KEYS.users);
  if (!users.some(({ id }) => id === seedUser.id)) {
    localStorage.setItem(KEYS.users, JSON.stringify([seedUser, ...users]));
  }
}

function sanitizeUser({ password: _password, ...user }: StoredUser): User {
  return user;
}

export function createLocalStorageServices(now: () => Date = () => new Date()): AppServices {
  ensureSeedUser();

  return {
    auth: {
      getCurrentUser: () => readObject<User>(KEYS.session),
      async login(email, password) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = readArray<StoredUser>(KEYS.users).find(
          (candidate) => candidate.email.toLowerCase() === normalizedEmail,
        );

        if (!user || user.password !== password) {
          throw new Error('E-mail ou senha incorretos.');
        }

        const session = sanitizeUser(user);
        localStorage.setItem(KEYS.session, JSON.stringify(session));
        return session;
      },
      async loginWithGoogle() {
        throw new Error('Login com Google será habilitado após a escolha entre Firebase e Supabase.');
      },
      async register(input) {
        const storedUsers = readArray<StoredUser>(KEYS.users);
        const normalizedEmail = input.email.trim().toLowerCase();

        if (storedUsers.some((user) => user.email.toLowerCase() === normalizedEmail)) {
          throw new Error('Este e-mail já está cadastrado.');
        }

        const storedUser: StoredUser = {
          id: crypto.randomUUID(),
          name: input.name.trim().replace(/\s+/g, ' '),
          email: normalizedEmail,
          profession: input.profession.trim(),
          phone: input.phone.trim(),
          password: input.password,
          createdAt: now().toISOString(),
        };

        localStorage.setItem(KEYS.users, JSON.stringify([...storedUsers, storedUser]));
        return sanitizeUser(storedUser);
      },
      async resetPassword(email) {
        const normalizedEmail = email.trim().toLowerCase();
        const resets = readArray<{ email: string; requestedAt: string; userExists: boolean }>(KEYS.resets);
        const userExists = readArray<StoredUser>(KEYS.users).some(
          (user) => user.email.toLowerCase() === normalizedEmail,
        );
        localStorage.setItem(KEYS.resets, JSON.stringify([
          ...resets,
          { email: normalizedEmail, requestedAt: now().toISOString(), userExists },
        ]));
      },
      async logout() {
        localStorage.removeItem(KEYS.session);
        sessionStorage.removeItem(KEYS.checkout);
      },
    },
    catalog: {
      async getUnits() {
        return units;
      },
      async getUnitById(id) {
        return units.find((unit) => unit.id === id) ?? null;
      },
      async getRoomsByUnitId(unitId) {
        return rooms.filter((room) => room.unitId === unitId);
      },
      async getRoomById(id) {
        return rooms.find((room) => room.id === id) ?? null;
      },
    },
    bookings: {
      async getByUserAndStatus(userId, status: BookingStatus) {
        const current = now();
        return readArray<Booking>(KEYS.bookings)
          .filter((booking) => booking.userId === userId)
          .map((booking) => ({ ...booking, status: getEffectiveBookingStatus(booking, current) }))
          .filter((booking) => booking.status === status);
      },
      async getCounts(userId) {
        const current = now();
        const userBookings = readArray<Booking>(KEYS.bookings).filter(
          (booking) => booking.userId === userId,
        ).map((booking) => ({ ...booking, status: getEffectiveBookingStatus(booking, current) }));
        return {
          upcoming: userBookings.filter(({ status }) => status === 'upcoming').length,
          past: userBookings.filter(({ status }) => status === 'past').length,
          cancelled: userBookings.filter(({ status }) => status === 'cancelled').length,
        };
      },
      async getAll() {
        const current = now();
        return readArray<Booking>(KEYS.bookings).map(
          (booking) => ({ ...booking, status: getEffectiveBookingStatus(booking, current) }),
        );
      },
      async create(input) {
        const existing = readArray<Booking>(KEYS.bookings);
        const booking: Booking = {
          ...input,
          id: `booking-${Date.now()}-${crypto.randomUUID()}`,
          createdAt: now().toISOString(),
        };
        localStorage.setItem(KEYS.bookings, JSON.stringify([booking, ...existing]));
        return booking;
      },
      async cancel(bookingId, userId) {
        const existing = readArray<Booking>(KEYS.bookings);
        const index = existing.findIndex((booking) => booking.id === bookingId);
        if (index < 0) throw new Error('Agendamento não encontrado.');
        const booking = existing[index];
        if (!booking || booking.userId !== userId) throw new Error('Você não pode cancelar este agendamento.');
        const current = now();
        if (booking.status === 'cancelled') throw new Error('Este agendamento já foi cancelado.');
        if (!canCancelBooking(booking, current)) {
          throw new Error('O cancelamento só é permitido com pelo menos 24 horas de antecedência.');
        }
        const cancelled: Booking = { ...booking, status: 'cancelled', cancelledAt: current.toISOString() };
        existing[index] = cancelled;
        localStorage.setItem(KEYS.bookings, JSON.stringify(existing));
        return cancelled;
      },
    },
    checkout: {
      getDraft: () => readSessionObject<CheckoutDraft>(KEYS.checkout),
      saveDraft(draft) {
        sessionStorage.setItem(KEYS.checkout, JSON.stringify(draft));
      },
      clearDraft() {
        sessionStorage.removeItem(KEYS.checkout);
      },
    },
  };
}

function readSessionObject<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
