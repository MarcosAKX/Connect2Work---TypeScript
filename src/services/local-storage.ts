import type { AppServices } from './contracts';
import { rooms as seedRooms, units as seedUnits } from './mock-data';
import { businessServices as seedBusinessServices } from './mock-business-services';
import type { AuditAction, AuditEntity, AuditLog, BackupPayload, Booking, BookingStatus, BusinessService, CheckoutDraft, CreateBusinessServiceInput, CreateManagedUserInput, CreateRoomInput, CreateTaskInput, HoursPlanTransaction, Room, StoredUser, Task, TaskStatus, Unit, UpdateManagedUserInput, UpdateTaskInput, User, UserRole } from '../types/domain';
import { bookingHasConflict, canCancelBooking, formatStorageDate, getEffectiveBookingStatus, isHoursPlanExpired, parseTimeSlot } from '../utils/booking';
import { TASKS_CHANGED_EVENT } from '../utils/tasks';
import { createEntityId } from './ids';
import { ValidationError } from './errors';

const STORAGE_SCHEMA_VERSION = 3;

const KEYS = {
  users: 'c2w_mock_users',
  units: 'c2w_mock_units',
  rooms: 'c2w_mock_rooms',
  businessServices: 'c2w_mock_business_services',
  session: 'c2w_mock_session',
  bookings: 'c2w_mock_bookings',
  resets: 'c2w_mock_password_resets',
  checkout: 'c2w_checkout_draft',
  tasks: 'c2w_mock_tasks',
  auditLogs: 'c2w_mock_audit_logs',
  hoursPlanTransactions: 'c2w_mock_hours_plan_transactions',
  schemaVersion: 'c2w_mock_schema_version',
  lastBackupAt: 'c2w_mock_last_backup_at',
} as const;

const seedUser: StoredUser = {
  id: 'seed-usuario-teste',
  name: 'Usuário Teste',
  email: 'teste@connect2work.com',
  password: '123456',
  role: 'client',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  hasHoursPlan: false,
  hoursBalance: 0,
};

const seedAdmin: StoredUser = {
  id: 'seed-administrador',
  name: 'Administrador',
  email: 'admin@connect2work.com',
  password: 'admin123',
  role: 'admin',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  hasHoursPlan: false,
  hoursBalance: 0,
};

const seedSecretary: StoredUser = {
  id: 'seed-secretaria',
  name: 'Secretaria',
  email: 'secretaria@connect2work.com',
  password: 'secretaria123',
  role: 'secretaria',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  hasHoursPlan: false,
  hoursBalance: 0,
};

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    preserveCorruptedValue(key);
    return [];
  }
}

function readObject<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    preserveCorruptedValue(key);
    return null;
  }
}

function preserveCorruptedValue(key: string) {
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    localStorage.setItem(`c2w_mock_corrupted_${key}_${Date.now()}`, raw);
  } catch {
    // O dado original permanece intacto quando nem a cópia de segurança cabe no navegador.
  }
}

function writeArray<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

function currentActorId() {
  return readObject<User>(KEYS.session)?.id;
}

function appendAudit(now: () => Date, action: AuditAction, entity: AuditEntity, entityId: string, details?: AuditLog['details'], actorUserId = currentActorId()) {
  try {
    const logs = readArray<AuditLog>(KEYS.auditLogs);
    const actorName = actorUserId ? readArray<StoredUser>(KEYS.users).find(({ id }) => id === actorUserId)?.name : undefined;
    const entry: AuditLog = { id: createEntityId(), actorUserId, actorName, action, entity, entityId, occurredAt: now().toISOString(), details };
    writeArray(KEYS.auditLogs, [entry, ...logs].slice(0, 5000));
  } catch {
    // Auditoria local não pode invalidar uma operação principal já concluída.
  }
}

function appendHoursTransaction(now: () => Date, input: Omit<HoursPlanTransaction, 'id' | 'createdAt'>) {
  const transactions = readArray<HoursPlanTransaction>(KEYS.hoursPlanTransactions);
  const entry: HoursPlanTransaction = { id: createEntityId(), createdAt: now().toISOString(), ...input };
  writeArray(KEYS.hoursPlanTransactions, [entry, ...transactions]);
}

function validateBackup(payload: BackupPayload) {
  if (!payload || ![1, 2, STORAGE_SCHEMA_VERSION].includes(payload.schemaVersion) || !payload.data) {
    throw new ValidationError('Backup incompatível com esta versão da aplicação.');
  }
  const collections: Array<keyof BackupPayload['data']> = ['users', 'units', 'rooms', 'bookings', 'tasks', 'auditLogs', 'hoursPlanTransactions'];
  if (collections.some((key) => !Array.isArray(payload.data[key]))) {
    throw new ValidationError('Backup inválido ou incompleto.');
  }
}

function ensureSeedUsers() {
  const users = readArray<StoredUser>(KEYS.users).map((user) => ({
    ...user,
    role: normalizeUserRole(user.role),
    active: user.active !== false,
    hasHoursPlan: user.hasHoursPlan === true,
    hoursBalance: Math.max(0, Number(user.hoursBalance) || 0),
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

function ensureSeedBusinessServices() {
  if (localStorage.getItem(KEYS.businessServices) === null) writeArray(KEYS.businessServices, seedBusinessServices);
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
    hasHoursPlan: user.hasHoursPlan === true,
    hoursBalance: Math.max(0, Number(user.hoursBalance) || 0),
  };
}

function refundPlanHours(booking: Booking, now: () => Date) {
  if (!booking.hoursFromPlan || booking.hoursFromPlan <= 0) return;
  const users = readArray<StoredUser>(KEYS.users);
  const index = users.findIndex((user) => user.id === booking.userId);
  const user = users[index];
  if (!user) return;
  // Decisão: saldo já pertencente ao cliente é devolvido mesmo com plano vencido.
  users[index] = { ...user, hoursBalance: Math.max(0, Number(user.hoursBalance) || 0) + booking.hoursFromPlan };
  localStorage.setItem(KEYS.users, JSON.stringify(users));
  appendHoursTransaction(now, { userId: booking.userId, bookingId: booking.id, type: 'refund', hours: booking.hoursFromPlan, balanceAfter: users[index].hoursBalance, reason: 'Estorno por cancelamento elegível', createdBy: currentActorId() });
}

function normalizeBusinessServiceInput(input: CreateBusinessServiceInput) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name || !description) throw new ValidationError('Informe nome e descrição do serviço.');
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) throw new ValidationError('Informe uma ordem válida.');
  return {
    kind: input.kind,
    name,
    description,
    primaryFeatures: input.primaryFeatures.map((item) => item.trim()).filter(Boolean),
    secondaryFeatures: input.secondaryFeatures.map((item) => item.trim()).filter(Boolean),
    imageUrl: input.imageUrl?.trim() || null,
    active: input.active,
    sortOrder: input.sortOrder,
  };
}

function getAdminUser(userId: string) {
  const user = getStaffUser(userId);
  if (user.role !== 'admin') throw new Error('Somente administradores podem gerenciar backups.');
  return user;
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
  ensureSeedBusinessServices();
  ensureSeedTasks(now());
  if (localStorage.getItem(KEYS.auditLogs) === null) writeArray(KEYS.auditLogs, []);
  if (localStorage.getItem(KEYS.hoursPlanTransactions) === null) writeArray(KEYS.hoursPlanTransactions, []);
  localStorage.setItem(KEYS.schemaVersion, String(STORAGE_SCHEMA_VERSION));

  return {
    auth: {
      getCurrentUser() {
        const session = readObject<User>(KEYS.session);
        if (!session) return null;
        const storedUser = readArray<StoredUser>(KEYS.users).find(({ id }) => id === session.id);
        if (!storedUser || !storedUser.active) {
          localStorage.removeItem(KEYS.session);
          return null;
        }
        return sanitizeUser({ ...storedUser, role: normalizeUserRole(storedUser.role) });
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
          id: createEntityId(),
          name: input.name.trim().replace(/\s+/g, ' '),
          email: normalizedEmail,
          profession: input.profession.trim(),
          phone: input.phone.trim(),
          password: input.password,
          role: 'client',
          active: true,
          hasHoursPlan: false,
          hoursBalance: 0,
          createdAt: now().toISOString(),
        };

        localStorage.setItem(KEYS.users, JSON.stringify([...storedUsers, storedUser]));
        appendAudit(now, 'create', 'user', storedUser.id, { source: 'self_registration' }, storedUser.id);
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
      async listUsersWithHoursPlanInfo() {
        return readArray<StoredUser>(KEYS.users).map(sanitizeUser);
      },
      async createUser(input) {
        const users = readArray<StoredUser>(KEYS.users);
        const normalized = normalizeManagedUserInput(input);
        if (!input.password) throw new Error('Informe uma senha.');
        if (users.some((user) => user.email.toLowerCase() === normalized.email)) throw new Error('Este e-mail já está cadastrado.');
        const created: StoredUser = {
          id: createEntityId(),
          ...normalized,
          password: input.password,
          hasHoursPlan: false,
          hoursBalance: 0,
          createdAt: now().toISOString(),
        };
        localStorage.setItem(KEYS.users, JSON.stringify([...users, created]));
        appendAudit(now, 'create', 'user', created.id, { role: created.role, active: created.active });
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
        appendAudit(now, 'update', 'user', id, { role: updated.role, active: updated.active });
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
        appendAudit(now, 'update', 'user', id, { role });
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
        appendAudit(now, 'update', 'user', id, { active });
        return sanitizeUser(updated);
      },
      async searchClients(query) {
        const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
        return readArray<StoredUser>(KEYS.users)
          .filter((user) => user.role === 'client' && user.active !== false)
          .filter((user) => !normalizedQuery || `${user.name} ${user.email}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
          .slice(0, 10)
          .map(sanitizeUser)
          .map(({ id, name, email, hasHoursPlan, hoursBalance, hoursPlanTotal, hoursPlanRenewsOn, hoursPlanPaymentConfirmed }) => ({ id, name, email, hasHoursPlan, hoursBalance, hoursPlanTotal, hoursPlanRenewsOn, hoursPlanPaymentConfirmed }));
      },
      async updateUserHoursPlan(userId, input) {
        const users = readArray<StoredUser>(KEYS.users);
        const index = users.findIndex((user) => user.id === userId);
        const current = users[index];
        if (!current) throw new Error('Usuário não encontrado.');
        if (!Number.isFinite(input.hoursBalance) || input.hoursBalance < 0) throw new Error('O saldo de horas não pode ser negativo.');
        if (input.hoursPlanTotal !== undefined && (!Number.isFinite(input.hoursPlanTotal) || input.hoursPlanTotal <= 0)) throw new Error('O total do plano deve ser maior que zero.');
        const previousBalance = Math.max(0, Number(current.hoursBalance) || 0);
        const nextBalance = input.hasHoursPlan ? input.hoursBalance : 0;
        const updated: StoredUser = {
          ...current,
          hasHoursPlan: input.hasHoursPlan,
          hoursBalance: nextBalance,
          hoursPlanTotal: input.hasHoursPlan ? input.hoursPlanTotal : undefined,
          hoursPlanRenewsOn: input.hasHoursPlan ? input.hoursPlanRenewsOn : undefined,
          hoursPlanPaymentConfirmed: input.hasHoursPlan ? (current.hoursPlanPaymentConfirmed ?? true) : undefined,
        };
        users[index] = updated;
        localStorage.setItem(KEYS.users, JSON.stringify(users));
        const difference = nextBalance - previousBalance;
        if (difference !== 0) appendHoursTransaction(now, { userId, type: 'adjustment', hours: difference, balanceAfter: nextBalance, reason: input.hasHoursPlan ? 'Ajuste manual do plano' : 'Desativação do plano', createdBy: currentActorId() });
        appendAudit(now, 'update', 'hours_plan', userId, { enabled: input.hasHoursPlan, previousBalance, balanceAfter: nextBalance });
        return sanitizeUser(updated);
      },
      async confirmHoursPlanRenewal(userId) {
        const users = readArray<StoredUser>(KEYS.users);
        const index = users.findIndex((user) => user.id === userId);
        const current = users[index];
        if (!current || !current.hasHoursPlan || !current.hoursPlanTotal) throw new Error('Usuário não possui plano de horas configurado.');
        if (!isHoursPlanExpired(sanitizeUser(current), formatStorageDate(now()))) throw new Error('O plano ainda não está aguardando renovação.');
        const renewalDate = now();
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        // Decisão: próximo vencimento avança a partir de hoje, evitando acumular atraso do ciclo anterior.
        const updated: StoredUser = { ...current, hoursBalance: current.hoursPlanTotal, hoursPlanPaymentConfirmed: true, hoursPlanLastRenewalAt: now().toISOString(), hoursPlanRenewsOn: formatStorageDate(renewalDate) };
        users[index] = updated;
        localStorage.setItem(KEYS.users, JSON.stringify(users));
        appendHoursTransaction(now, { userId, type: 'credit', hours: current.hoursPlanTotal, balanceAfter: current.hoursPlanTotal, reason: 'Renovação do plano', createdBy: currentActorId() });
        appendAudit(now, 'renew', 'hours_plan', userId, { hours: current.hoursPlanTotal });
        return sanitizeUser(updated);
      },
    },
    catalog: {
      async getUnits() {
        return readArray<Unit>(KEYS.units).map((unit) => {
          const seed = seedUnits.find(({ id }) => id === unit.id);
          const hasLegacySeedAddress = /^Rua das Empresas, 100 - Centro,?$/i.test(unit.address.trim()) || /^Av\. dos Negócios, 500 - Zona Sul,?$/i.test(unit.address.trim());
          return {
            ...unit,
            address: hasLegacySeedAddress ? seed?.address ?? unit.address : unit.address,
            description: hasLegacySeedAddress ? seed?.description ?? unit.description : unit.description,
            latitude: hasLegacySeedAddress ? seed?.latitude : unit.latitude ?? seed?.latitude,
            longitude: hasLegacySeedAddress ? seed?.longitude : unit.longitude ?? seed?.longitude,
          };
        });
      },
      async getUnitById(id) {
        const unit = readArray<Unit>(KEYS.units).find((candidate) => candidate.id === id);
        if (!unit) return null;
        const seed = seedUnits.find((candidate) => candidate.id === id);
        const hasLegacySeedAddress = /^Rua das Empresas, 100 - Centro,?$/i.test(unit.address.trim()) || /^Av\. dos Negócios, 500 - Zona Sul,?$/i.test(unit.address.trim());
        return {
          ...unit,
          address: hasLegacySeedAddress ? seed?.address ?? unit.address : unit.address,
          description: hasLegacySeedAddress ? seed?.description ?? unit.description : unit.description,
          latitude: hasLegacySeedAddress ? seed?.latitude : unit.latitude ?? seed?.latitude,
          longitude: hasLegacySeedAddress ? seed?.longitude : unit.longitude ?? seed?.longitude,
        };
      },
      async createUnit(input) {
        const existing = readArray<Unit>(KEYS.units);
        const unit: Unit = {
          id: createEntityId(),
          name: input.name.trim(),
          address: input.address.trim(),
          description: input.description?.trim() || undefined,
          imageUrl: input.imageUrl,
          latitude: input.latitude,
          longitude: input.longitude,
          availableRooms: 0,
        };
        localStorage.setItem(KEYS.units, JSON.stringify([...existing, unit]));
        appendAudit(now, 'create', 'unit', unit.id, { name: unit.name });
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
          latitude: input.latitude,
          longitude: input.longitude,
        };
        existing[index] = updated;
        localStorage.setItem(KEYS.units, JSON.stringify(existing));
        appendAudit(now, 'update', 'unit', id, { name: updated.name });
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
        appendAudit(now, 'delete', 'unit', id, { name: unit.name });
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
          id: createEntityId(),
          ...normalizeRoomInput(input),
        };
        localStorage.setItem(KEYS.rooms, JSON.stringify([...existing, room]));
        appendAudit(now, 'create', 'room', room.id, { unitId: room.unitId, name: room.name });
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
        appendAudit(now, 'update', 'room', id, { unitId: updated.unitId, name: updated.name });
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
        appendAudit(now, 'delete', 'room', id, { name: room.name });
      },
    },
    businessServices: {
      async listServices(options) {
        return readArray<BusinessService>(KEYS.businessServices)
          .filter((service) => options?.includeInactive || service.active)
          .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'pt-BR'));
      },
      async createService(input) {
        const existing = readArray<BusinessService>(KEYS.businessServices);
        if (existing.some((service) => service.kind === input.kind)) throw new ValidationError('Já existe um serviço deste tipo.');
        const created: BusinessService = { id: createEntityId(), ...normalizeBusinessServiceInput(input), createdAt: now().toISOString() };
        writeArray(KEYS.businessServices, [...existing, created]);
        appendAudit(now, 'create', 'business_service', created.id, { name: created.name, kind: created.kind });
        return created;
      },
      async updateService(id, input) {
        const existing = readArray<BusinessService>(KEYS.businessServices);
        const index = existing.findIndex((service) => service.id === id);
        const current = existing[index];
        if (!current) throw new ValidationError('Serviço não encontrado.');
        if (existing.some((service) => service.id !== id && service.kind === input.kind)) throw new ValidationError('Já existe um serviço deste tipo.');
        const updated: BusinessService = { ...current, ...normalizeBusinessServiceInput(input), updatedAt: now().toISOString() };
        existing[index] = updated;
        writeArray(KEYS.businessServices, existing);
        appendAudit(now, 'update', 'business_service', id, { name: updated.name, active: updated.active });
        return updated;
      },
      async deleteService(id) {
        const existing = readArray<BusinessService>(KEYS.businessServices);
        const current = existing.find((service) => service.id === id);
        if (!current) throw new ValidationError('Serviço não encontrado.');
        writeArray(KEYS.businessServices, existing.filter((service) => service.id !== id));
        appendAudit(now, 'delete', 'business_service', id, { name: current.name });
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
        if (input.hoursFromPlan && input.hoursFromPlan > 0) {
          const users = readArray<StoredUser>(KEYS.users);
          const userIndex = users.findIndex((user) => user.id === input.userId);
          const planUser = users[userIndex];
          if (!planUser || !planUser.hasHoursPlan || isHoursPlanExpired(sanitizeUser(planUser), formatStorageDate(now()))) throw new Error('O plano de horas não está disponível para esta reserva.');
          const balance = Math.max(0, Number(planUser.hoursBalance) || 0);
          if (balance < input.hoursFromPlan) throw new Error('Saldo do plano de horas insuficiente.');
          users[userIndex] = { ...planUser, hoursBalance: balance - input.hoursFromPlan };
          localStorage.setItem(KEYS.users, JSON.stringify(users));
        }
        const booking: Booking = {
          ...input,
          adminStatus: input.adminStatus ?? (input.status === 'cancelled' ? 'cancelled' : 'confirmed'),
          id: createEntityId(),
          createdAt: now().toISOString(),
        };
        localStorage.setItem(KEYS.bookings, JSON.stringify([booking, ...existing]));
        if (booking.hoursFromPlan && booking.hoursFromPlan > 0) {
          const balanceAfter = readArray<StoredUser>(KEYS.users).find((user) => user.id === booking.userId)?.hoursBalance ?? 0;
          appendHoursTransaction(now, { userId: booking.userId, bookingId: booking.id, type: 'debit', hours: -booking.hoursFromPlan, balanceAfter, reason: 'Consumo em agendamento', createdBy: currentActorId() ?? booking.userId });
        }
        appendAudit(now, 'create', 'booking', booking.id, { userId: booking.userId, roomId: booking.roomId, date: booking.date });
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
        refundPlanHours(booking, now);
        appendAudit(now, 'cancel', 'booking', bookingId, { source: 'client' }, userId);
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
        appendAudit(now, 'confirm', 'booking', bookingId, { kind: 'booking' });
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
        appendAudit(now, 'confirm', 'booking', bookingId, { kind: 'payment' });
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
        appendAudit(now, 'check_in', 'booking', bookingId, undefined, staffUserId);
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
        if (canCancelBooking(booking, now())) refundPlanHours(booking, now);
        appendAudit(now, 'cancel', 'booking', bookingId, { source: 'staff', reason: normalizedReason });
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
          id: createEntityId(),
          ...normalized,
          status: input.status ?? 'todo',
          createdBy: input.createdBy,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        localStorage.setItem(KEYS.tasks, JSON.stringify([task, ...readArray<Task>(KEYS.tasks)]));
        appendAudit(now, 'create', 'task', task.id, { status: task.status }, input.createdBy);
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
        appendAudit(now, 'update', 'task', id, { status: updated.status }, actorUserId);
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
        appendAudit(now, 'update', 'task', id, { status }, actorUserId);
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
        appendAudit(now, 'delete', 'task', id, undefined, actorUserId);
        notifyTasksChanged();
      },
    },
    audit: {
      async listRecent(actorUserId, limit = 100) {
        getStaffUser(actorUserId);
        const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
        return readArray<AuditLog>(KEYS.auditLogs).slice(0, safeLimit);
      },
      async listHoursPlanTransactions(userId, actorUserId) {
        getStaffUser(actorUserId);
        return readArray<HoursPlanTransaction>(KEYS.hoursPlanTransactions)
          .filter((transaction) => transaction.userId === userId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      },
    },
    backup: {
      async exportData(actorUserId) {
        getAdminUser(actorUserId);
        const exportedAt = now().toISOString();
        const payload = {
          schemaVersion: STORAGE_SCHEMA_VERSION,
          exportedAt,
          credentialsIncluded: false,
          data: {
            users: readArray<StoredUser>(KEYS.users).map(sanitizeUser),
            units: readArray<Unit>(KEYS.units),
            rooms: readArray<Room>(KEYS.rooms),
            businessServices: readArray<BusinessService>(KEYS.businessServices),
            bookings: readArray<Booking>(KEYS.bookings),
            tasks: readArray<Task>(KEYS.tasks),
            auditLogs: readArray<AuditLog>(KEYS.auditLogs),
            hoursPlanTransactions: readArray<HoursPlanTransaction>(KEYS.hoursPlanTransactions),
          },
        } satisfies BackupPayload;
        localStorage.setItem(KEYS.lastBackupAt, exportedAt);
        return payload;
      },
      async importData(payload, actorUserId) {
        getAdminUser(actorUserId);
        validateBackup(payload);
        const rollback = {
          users: readArray<StoredUser>(KEYS.users),
          units: readArray<Unit>(KEYS.units),
          rooms: readArray<Room>(KEYS.rooms),
          businessServices: readArray<BusinessService>(KEYS.businessServices),
          bookings: readArray<Booking>(KEYS.bookings),
          tasks: readArray<Task>(KEYS.tasks),
          auditLogs: readArray<AuditLog>(KEYS.auditLogs),
          hoursPlanTransactions: readArray<HoursPlanTransaction>(KEYS.hoursPlanTransactions),
        };
        try {
          const currentUsers = readArray<StoredUser>(KEYS.users);
          const restoredUsers: StoredUser[] = payload.data.users.map((restoredUser) => {
            const current = currentUsers.find(({ id, email }) => id === restoredUser.id || email.toLowerCase() === restoredUser.email.toLowerCase());
            return {
              ...restoredUser,
              password: current?.password ?? createEntityId(),
              active: current ? restoredUser.active : false,
            };
          });
          writeArray(KEYS.users, restoredUsers);
          writeArray(KEYS.units, payload.data.units);
          writeArray(KEYS.rooms, payload.data.rooms);
          writeArray(KEYS.businessServices, payload.data.businessServices ?? seedBusinessServices);
          writeArray(KEYS.bookings, payload.data.bookings);
          writeArray(KEYS.tasks, payload.data.tasks);
          writeArray(KEYS.auditLogs, payload.data.auditLogs);
          writeArray(KEYS.hoursPlanTransactions, payload.data.hoursPlanTransactions);
          localStorage.setItem(KEYS.schemaVersion, String(STORAGE_SCHEMA_VERSION));
          appendAudit(now, 'import', 'backup', `schema-${payload.schemaVersion}`, { exportedAt: payload.exportedAt }, actorUserId);
          localStorage.removeItem(KEYS.session);
          notifyTasksChanged();
        } catch (error) {
          writeArray(KEYS.users, rollback.users);
          writeArray(KEYS.units, rollback.units);
          writeArray(KEYS.rooms, rollback.rooms);
          writeArray(KEYS.businessServices, rollback.businessServices);
          writeArray(KEYS.bookings, rollback.bookings);
          writeArray(KEYS.tasks, rollback.tasks);
          writeArray(KEYS.auditLogs, rollback.auditLogs);
          writeArray(KEYS.hoursPlanTransactions, rollback.hoursPlanTransactions);
          throw error;
        }
      },
      async getLastBackupAt(actorUserId) {
        getAdminUser(actorUserId);
        return localStorage.getItem(KEYS.lastBackupAt);
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
