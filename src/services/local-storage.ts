import type { AppServices } from './contracts';
import { rooms as seedRooms, units as seedUnits } from './mock-data';
import type { Booking, BookingStatus, CheckoutDraft, CreateRoomInput, Room, StoredUser, Unit, User, UserRole } from '../types/domain';
import { canCancelBooking, getEffectiveBookingStatus } from '../utils/booking';

const KEYS = {
  users: 'c2w_mock_users',
  units: 'c2w_mock_units',
  rooms: 'c2w_mock_rooms',
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
  role: 'client',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const seedAdmin: StoredUser = {
  id: 'seed-administrador',
  name: 'Administrador',
  email: 'admin@connect2work.com',
  password: 'admin123',
  role: 'admin',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const seedSecretary: StoredUser = {
  id: 'seed-secretaria',
  name: 'Secretaria',
  email: 'secretaria@connect2work.com',
  password: 'secretaria123',
  role: 'secretaria',
  active: true,
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

function ensureSeedUsers() {
  const users = readArray<StoredUser>(KEYS.users).map((user) => ({
    ...user,
    role: normalizeUserRole(user.role),
    active: user.active !== false,
  }));
  const seeds = [seedUser, seedAdmin, seedSecretary].filter(
    (seed) => !users.some(({ id }) => id === seed.id),
  );
  localStorage.setItem(KEYS.users, JSON.stringify([...seeds, ...users]));
}

function ensureSeedUnits() {
  if (localStorage.getItem(KEYS.units) === null) {
    localStorage.setItem(KEYS.units, JSON.stringify(seedUnits));
  }
}

function ensureSeedRooms() {
  if (localStorage.getItem(KEYS.rooms) === null) {
    localStorage.setItem(KEYS.rooms, JSON.stringify(seedRooms));
  }
}

function normalizeRoomInput(input: CreateRoomInput) {
  const imageUrls = (input.imageUrls ?? []).filter(Boolean);
  const normalizedImages = imageUrls.length > 0
    ? imageUrls
    : input.imageUrl ? [input.imageUrl] : [];
  return {
    unitId: input.unitId,
    name: input.name.trim(),
    capacity: input.capacity,
    pricePerHour: input.pricePerHour,
    amenities: input.amenities.map((amenity) => amenity.trim()).filter(Boolean),
    imageUrl: normalizedImages[0] ?? null,
    imageUrls: normalizedImages,
  };
}

function normalizeUserRole(role: unknown): UserRole {
  if (role === 'admin' || role === 'secretaria') return role;
  return 'client';
}

function sanitizeUser({ password: _password, ...user }: StoredUser): User {
  return {
    ...user,
    role: normalizeUserRole(user.role),
    active: user.active !== false,
  };
}

export function createLocalStorageServices(now: () => Date = () => new Date()): AppServices {
  ensureSeedUsers();
  ensureSeedUnits();
  ensureSeedRooms();

  return {
    auth: {
      getCurrentUser() {
        const session = readObject<User>(KEYS.session);
        if (!session) return null;
        const storedUser = readArray<StoredUser>(KEYS.users).find(({ id }) => id === session.id);
        if (storedUser?.active === false) {
          localStorage.removeItem(KEYS.session);
          return null;
        }
        return {
          ...session,
          role: normalizeUserRole(session.role),
          active: session.active !== false,
        };
      },
      async getUserById(id) {
        const user = readArray<StoredUser>(KEYS.users).find((candidate) => candidate.id === id);
        return user ? sanitizeUser(user) : null;
      },
      async login(email, password) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = readArray<StoredUser>(KEYS.users).find(
          (candidate) => candidate.email.toLowerCase() === normalizedEmail,
        );

        if (!user || user.password !== password) {
          throw new Error('E-mail ou senha incorretos.');
        }
        if (!user.active) throw new Error('Esta conta está inativa. Procure um administrador.');

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
          role: 'client',
          active: true,
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
    users: {
      async listUsers() {
        return readArray<StoredUser>(KEYS.users).map(sanitizeUser);
      },
      async updateUserRole(id, role) {
        const users = readArray<StoredUser>(KEYS.users);
        const index = users.findIndex((user) => user.id === id);
        const current = users[index];
        if (!current) throw new Error('Usuário não encontrado.');
        const session = readObject<User>(KEYS.session);
        if (session?.id === id && role !== 'admin') {
          throw new Error('Você não pode remover sua própria permissão de administrador.');
        }
        const updated: StoredUser = { ...current, role };
        users[index] = updated;
        localStorage.setItem(KEYS.users, JSON.stringify(users));
        return sanitizeUser(updated);
      },
      async updateUserStatus(id, active) {
        const users = readArray<StoredUser>(KEYS.users);
        const index = users.findIndex((user) => user.id === id);
        const current = users[index];
        if (!current) throw new Error('Usuário não encontrado.');
        const session = readObject<User>(KEYS.session);
        if (session?.id === id && !active) {
          throw new Error('Você não pode desativar sua própria conta.');
        }
        const updated: StoredUser = { ...current, active };
        users[index] = updated;
        localStorage.setItem(KEYS.users, JSON.stringify(users));
        return sanitizeUser(updated);
      },
      async searchClients(query) {
        const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
        return readArray<StoredUser>(KEYS.users)
          .filter((user) => user.role === 'client' && user.active !== false)
          .filter((user) => !normalizedQuery || `${user.name} ${user.email}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
          .slice(0, 10)
          .map(({ id, name, email }) => ({ id, name, email }));
      },
    },
    catalog: {
      async getUnits() {
        return readArray<Unit>(KEYS.units);
      },
      async getUnitById(id) {
        return readArray<Unit>(KEYS.units).find((unit) => unit.id === id) ?? null;
      },
      async createUnit(input) {
        const existing = readArray<Unit>(KEYS.units);
        const unit: Unit = {
          id: `unit-${Date.now()}-${crypto.randomUUID()}`,
          name: input.name.trim(),
          address: input.address.trim(),
          description: input.description?.trim() || undefined,
          imageUrl: input.imageUrl,
          availableRooms: 0,
        };
        localStorage.setItem(KEYS.units, JSON.stringify([...existing, unit]));
        return unit;
      },
      async updateUnit(id, input) {
        const existing = readArray<Unit>(KEYS.units);
        const index = existing.findIndex((unit) => unit.id === id);
        const current = existing[index];
        if (!current) throw new Error('Unidade não encontrada.');
        const updated: Unit = {
          ...current,
          name: input.name.trim(),
          address: input.address.trim(),
          description: input.description?.trim() || undefined,
          imageUrl: input.imageUrl,
        };
        existing[index] = updated;
        localStorage.setItem(KEYS.units, JSON.stringify(existing));
        return updated;
      },
      async deleteUnit(id) {
        const existing = readArray<Unit>(KEYS.units);
        const unit = existing.find((candidate) => candidate.id === id);
        if (!unit) throw new Error('Unidade não encontrada.');

        // Regra deliberada: impedir exclusão enquanto houver salas vinculadas.
        // Se o produto adotar exclusão em cascata, este bloqueio deve ser substituído
        // pela remoção atômica das salas e pela validação dos agendamentos relacionados.
        if (readArray<Room>(KEYS.rooms).some((room) => room.unitId === id)) {
          throw new Error(`Não é possível excluir ${unit.name} enquanto houver salas vinculadas.`);
        }

        localStorage.setItem(KEYS.units, JSON.stringify(existing.filter((candidate) => candidate.id !== id)));
      },
      async getRoomsByUnitId(unitId) {
        return readArray<Room>(KEYS.rooms).filter((room) => room.unitId === unitId);
      },
      async getRoomById(id) {
        return readArray<Room>(KEYS.rooms).find((room) => room.id === id) ?? null;
      },
      async createRoom(input) {
        const units = readArray<Unit>(KEYS.units);
        if (!units.some((unit) => unit.id === input.unitId)) throw new Error('Unidade não encontrada.');
        const existing = readArray<Room>(KEYS.rooms);
        const room: Room = {
          id: `room-${Date.now()}-${crypto.randomUUID()}`,
          ...normalizeRoomInput(input),
        };
        localStorage.setItem(KEYS.rooms, JSON.stringify([...existing, room]));
        return room;
      },
      async updateRoom(id, input) {
        const existing = readArray<Room>(KEYS.rooms);
        const index = existing.findIndex((room) => room.id === id);
        const current = existing[index];
        if (!current) throw new Error('Sala não encontrada.');
        if (!readArray<Unit>(KEYS.units).some((unit) => unit.id === input.unitId)) {
          throw new Error('Unidade não encontrada.');
        }
        const updated: Room = { ...current, ...normalizeRoomInput(input) };
        existing[index] = updated;
        localStorage.setItem(KEYS.rooms, JSON.stringify(existing));
        return updated;
      },
      async deleteRoom(id) {
        const existing = readArray<Room>(KEYS.rooms);
        const room = existing.find((candidate) => candidate.id === id);
        if (!room) throw new Error('Sala não encontrada.');

        // Regra deliberada: impedir exclusão de sala com agendamentos vinculados.
        // Preserva o histórico; se o produto adotar arquivamento, trocar esta remoção por status inativo.
        if (readArray<Booking>(KEYS.bookings).some((booking) => booking.roomId === id)) {
          throw new Error(`Não é possível excluir ${room.name} enquanto houver agendamentos vinculados.`);
        }
        localStorage.setItem(KEYS.rooms, JSON.stringify(existing.filter((candidate) => candidate.id !== id)));
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
          adminStatus: input.adminStatus ?? (input.status === 'cancelled' ? 'cancelled' : 'confirmed'),
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
        const cancelled: Booking = { ...booking, status: 'cancelled', adminStatus: 'cancelled', cancelledAt: current.toISOString() };
        existing[index] = cancelled;
        localStorage.setItem(KEYS.bookings, JSON.stringify(existing));
        return cancelled;
      },
      async confirmBooking(bookingId) {
        const existing = readArray<Booking>(KEYS.bookings);
        const index = existing.findIndex((booking) => booking.id === bookingId);
        const booking = existing[index];
        if (!booking) throw new Error('Agendamento não encontrado.');
        if (booking.status === 'cancelled' || booking.adminStatus === 'cancelled') {
          throw new Error('Agendamento cancelado não pode ser confirmado.');
        }
        const confirmed: Booking = { ...booking, adminStatus: 'confirmed' };
        existing[index] = confirmed;
        localStorage.setItem(KEYS.bookings, JSON.stringify(existing));
        return confirmed;
      },
      async confirmPayment(bookingId) {
        const existing = readArray<Booking>(KEYS.bookings);
        const index = existing.findIndex((booking) => booking.id === bookingId);
        const booking = existing[index];
        if (!booking) throw new Error('Agendamento não encontrado.');
        if (booking.status === 'cancelled' || booking.adminStatus === 'cancelled') {
          throw new Error('Não é possível confirmar o pagamento de um agendamento cancelado.');
        }
        if (booking.paymentStatus === 'completed') {
          throw new Error('O pagamento deste agendamento já foi confirmado.');
        }
        const paid: Booking = { ...booking, paymentStatus: 'completed' };
        existing[index] = paid;
        localStorage.setItem(KEYS.bookings, JSON.stringify(existing));
        return paid;
      },
      async checkInBooking(bookingId, staffUserId) {
        const staff = readArray<StoredUser>(KEYS.users).find((user) => user.id === staffUserId);
        if (!staff || staff.active === false || (staff.role !== 'admin' && staff.role !== 'secretaria')) {
          throw new Error('Usuário sem permissão para realizar check-in.');
        }
        const existing = readArray<Booking>(KEYS.bookings);
        const index = existing.findIndex((booking) => booking.id === bookingId);
        const booking = existing[index];
        if (!booking) throw new Error('Agendamento não encontrado.');
        const adminStatus = booking.status === 'cancelled' ? 'cancelled' : (booking.adminStatus ?? 'confirmed');
        if (adminStatus !== 'confirmed') {
          throw new Error('Check-in permitido somente em agendamentos confirmados.');
        }
        if (booking.checkedInAt) throw new Error('O check-in deste agendamento já foi realizado.');
        const checkedIn: Booking = {
          ...booking,
          checkedInAt: now().toISOString(),
          checkedInBy: staffUserId,
        };
        existing[index] = checkedIn;
        localStorage.setItem(KEYS.bookings, JSON.stringify(existing));
        return checkedIn;
      },
      async cancelBookingAsAdmin(bookingId, reason) {
        const normalizedReason = reason.trim();
        if (!normalizedReason) throw new Error('Informe o motivo do cancelamento.');
        const existing = readArray<Booking>(KEYS.bookings);
        const index = existing.findIndex((booking) => booking.id === bookingId);
        const booking = existing[index];
        if (!booking) throw new Error('Agendamento não encontrado.');
        if (booking.status === 'cancelled' || booking.adminStatus === 'cancelled') {
          throw new Error('Agendamento já foi cancelado.');
        }
        const cancelled: Booking = { ...booking, status: 'cancelled', adminStatus: 'cancelled', cancelledAt: now().toISOString(), cancellationReason: normalizedReason };
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
