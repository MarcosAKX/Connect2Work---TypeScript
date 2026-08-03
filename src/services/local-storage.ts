import type { AppServices } from './contracts';
import { rooms as seedRooms, units as seedUnits } from './mock-data';
import type { Booking, BookingStatus, CheckoutDraft, CreateManagedUserInput, CreateRoomInput, CreateTaskInput, Room, StoredUser, Task, TaskStatus, Unit, UpdateManagedUserInput, UpdateTaskInput, User, UserRole } from '../types/domain';
import { bookingHasConflict, canCancelBooking, getEffectiveBookingStatus, parseTimeSlot } from '../utils/booking';
import { TASKS_CHANGED_EVENT } from '../utils/tasks';

const KEYS = {
  users: 'c2w_mock_users',
  units: 'c2w_mock_units',
  rooms: 'c2w_mock_rooms',
  session: 'c2w_mock_session',
  bookings: 'c2w_mock_bookings',
  resets: 'c2w_mock_password_resets',
  checkout: 'c2w_checkout_draft',
  tasks: 'c2w_mock_tasks',
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

function dateKeyWithOffset(base: Date, offset: number) {
  const date = new Date(base);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function ensureSeedTasks(current: Date) {
  if (localStorage.getItem(KEYS.tasks) !== null) return;
  const createdAt = current.toISOString();
  const tasks: Task[] = [
    { id: 'task-seed-1', title: 'Confirmar fornecedores do café', description: 'Validar entrega e quantidades para a próxima semana.', status: 'todo', assignedTo: seedSecretary.id, priority: 'high', dueDate: dateKeyWithOffset(current, -1), createdBy: seedAdmin.id, createdAt, updatedAt: createdAt },
    { id: 'task-seed-2', title: 'Revisar agenda de amanhã', status: 'todo', assignedTo: seedSecretary.id, priority: 'medium', dueDate: dateKeyWithOffset(current, 0), createdBy: seedAdmin.id, createdAt, updatedAt: createdAt },
    { id: 'task-seed-3', title: 'Atualizar sinalização da unidade', description: 'Conferir placas das salas e recepção.', status: 'in_progress', assignedTo: seedAdmin.id, priority: 'medium', dueDate: dateKeyWithOffset(current, 2), createdBy: seedSecretary.id, createdAt, updatedAt: createdAt },
    { id: 'task-seed-4', title: 'Enviar relatório semanal', status: 'done', priority: 'low', dueDate: dateKeyWithOffset(current, -2), createdBy: seedSecretary.id, createdAt, updatedAt: createdAt },
  ];
  localStorage.setItem(KEYS.tasks, JSON.stringify(tasks));
}

function notifyTasksChanged() {
  window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));
}

function assertStaffUser(userId: string | undefined) {
  if (!userId) return;
  getStaffUser(userId);
}

function getStaffUser(userId: string) {
  const user = readArray<StoredUser>(KEYS.users).find((candidate) => candidate.id === userId);
  if (!user || !user.active || (user.role !== 'admin' && user.role !== 'secretaria')) {
    throw new Error('Responsável inválido para esta tarefa.');
  }
  return user;
}

function normalizeTaskInput(input: CreateTaskInput | UpdateTaskInput) {
  const title = input.title.trim().replace(/\s+/g, ' ');
  if (!title) throw new Error('Informe o título da tarefa.');
  assertStaffUser(input.assignedTo);
  return {
    title,
    description: input.description?.trim() || undefined,
    assignedTo: input.assignedTo || undefined,
    priority: input.priority,
    dueDate: input.dueDate || undefined,
  };
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

function normalizeManagedUserInput(input: CreateManagedUserInput | UpdateManagedUserInput) {
  const name = input.name.trim().replace(/\s+/g, ' ');
  const email = input.email.trim().toLowerCase();
  if (name.length < 2) throw new Error('Informe um nome válido.');
  if (!email.includes('@') || email.length > 254) throw new Error('Informe um e-mail válido.');
  if ('password' in input && input.password && input.password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
  return {
    name,
    email,
    profession: input.profession?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    role: normalizeUserRole(input.role),
    active: input.active,
  };
}

export function createLocalStorageServices(now: () => Date = () => new Date()): AppServices {
  ensureSeedUsers();
  ensureSeedUnits();
  ensureSeedRooms();
  ensureSeedTasks(now());

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
      async createUser(input) {
        const users = readArray<StoredUser>(KEYS.users);
        const normalized = normalizeManagedUserInput(input);
        if (!input.password) throw new Error('Informe uma senha.');
        if (users.some((user) => user.email.toLowerCase() === normalized.email)) throw new Error('Este e-mail já está cadastrado.');
        const created: StoredUser = {
          id: `user-${crypto.randomUUID()}`,
          ...normalized,
          password: input.password,
          createdAt: now().toISOString(),
        };
        localStorage.setItem(KEYS.users, JSON.stringify([...users, created]));
        return sanitizeUser(created);
      },
      async updateUser(id, input) {
        const users = readArray<StoredUser>(KEYS.users);
        const index = users.findIndex((user) => user.id === id);
        const current = users[index];
        if (!current) throw new Error('Usuário não encontrado.');
        const normalized = normalizeManagedUserInput(input);
        if (users.some((user) => user.id !== id && user.email.toLowerCase() === normalized.email)) throw new Error('Este e-mail já está cadastrado.');
        const session = readObject<User>(KEYS.session);
        if (session?.id === id && normalized.role !== 'admin') throw new Error('Você não pode remover sua própria permissão de administrador.');
        if (session?.id === id && !normalized.active) throw new Error('Você não pode desativar sua própria conta.');
        const updated: StoredUser = {
          ...current,
          ...normalized,
          password: input.password || current.password,
        };
        users[index] = updated;
        localStorage.setItem(KEYS.users, JSON.stringify(users));
        if (session?.id === id) localStorage.setItem(KEYS.session, JSON.stringify(sanitizeUser(updated)));
        return sanitizeUser(updated);
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
        const range = parseTimeSlot(input.timeSlot);
        if (!range || range.end <= range.start) throw new Error('O período do agendamento é inválido.');
        if (bookingHasConflict(existing, input.roomId, input.date, input.timeSlot)) {
          throw new Error('Este horário já está ocupado para a sala selecionada.');
        }
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
    tasks: {
      async listTasks() {
        return readArray<Task>(KEYS.tasks);
      },
      async createTask(input) {
        assertStaffUser(input.createdBy);
        const normalized = normalizeTaskInput(input);
        const timestamp = now().toISOString();
        const task: Task = {
          id: `task-${crypto.randomUUID()}`,
          ...normalized,
          status: input.status ?? 'todo',
          createdBy: input.createdBy,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        localStorage.setItem(KEYS.tasks, JSON.stringify([task, ...readArray<Task>(KEYS.tasks)]));
        notifyTasksChanged();
        return task;
      },
      async updateTask(id, input, actorUserId) {
        const tasks = readArray<Task>(KEYS.tasks);
        const index = tasks.findIndex((task) => task.id === id);
        const current = tasks[index];
        if (!current) throw new Error('Tarefa não encontrada.');
        const actor = getStaffUser(actorUserId);
        const normalized = normalizeTaskInput(input);
        if (actor.role === 'secretaria') {
          if (current.createdBy !== actorUserId) {
            throw new Error('A secretária pode editar somente as tarefas que criou.');
          }
          if (normalized.dueDate !== current.dueDate) {
            throw new Error('A data estimada só pode ser definida durante a criação da tarefa.');
          }
        }
        const updated: Task = { ...current, ...normalized, updatedAt: now().toISOString() };
        tasks[index] = updated;
        localStorage.setItem(KEYS.tasks, JSON.stringify(tasks));
        notifyTasksChanged();
        return updated;
      },
      async updateTaskStatus(id, status: TaskStatus, actorUserId) {
        const tasks = readArray<Task>(KEYS.tasks);
        const index = tasks.findIndex((task) => task.id === id);
        const current = tasks[index];
        if (!current) throw new Error('Tarefa não encontrada.');
        getStaffUser(actorUserId);
        const updated: Task = { ...current, status, updatedAt: now().toISOString() };
        tasks[index] = updated;
        localStorage.setItem(KEYS.tasks, JSON.stringify(tasks));
        notifyTasksChanged();
        return updated;
      },
      async deleteTask(id, actorUserId) {
        const tasks = readArray<Task>(KEYS.tasks);
        const current = tasks.find((task) => task.id === id);
        if (!current) throw new Error('Tarefa não encontrada.');
        const actor = getStaffUser(actorUserId);
        if (actor.role !== 'admin' && current.createdBy !== actorUserId) {
          throw new Error('Somente quem criou a tarefa pode excluí-la.');
        }
        localStorage.setItem(KEYS.tasks, JSON.stringify(tasks.filter((task) => task.id !== id)));
        notifyTasksChanged();
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
