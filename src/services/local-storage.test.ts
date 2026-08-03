import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStorageServices } from './local-storage';

describe('localStorage services', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('autentica seed e encerra sessão', async () => {
    const services = createLocalStorageServices();
    const user = await services.auth.login('teste@connect2work.com', '123456');
    expect(user.name).toBe('Usuário Teste');
    expect(user.role).toBe('client');
    expect(services.auth.getCurrentUser()?.id).toBe(user.id);
    await services.auth.logout();
    expect(services.auth.getCurrentUser()).toBeNull();
  });

  it('autentica o administrador seed com o perfil correto', async () => {
    const services = createLocalStorageServices();
    const admin = await services.auth.login('admin@connect2work.com', 'admin123');
    expect(admin).toMatchObject({ name: 'Administrador', role: 'admin' });
    expect(services.auth.getCurrentUser()?.role).toBe('admin');
  });

  it('consulta usuário por id sem expor a senha', async () => {
    const services = createLocalStorageServices();
    const user = await services.auth.getUserById('seed-usuario-teste');
    expect(user).toMatchObject({ name: 'Usuário Teste', role: 'client' });
    expect(user).not.toHaveProperty('password');
  });

  it('trata sessões antigas sem perfil como cliente', () => {
    localStorage.setItem('c2w_mock_session', JSON.stringify({
      id: 'legacy-user',
      name: 'Usuário Antigo',
      email: 'antigo@example.com',
      createdAt: '2025-01-01T00:00:00.000Z',
    }));
    const services = createLocalStorageServices();
    expect(services.auth.getCurrentUser()?.role).toBe('client');
  });

  it('mantém catálogo tipado por unidade', async () => {
    const services = createLocalStorageServices();
    const rooms = await services.catalog.getRoomsByUnitId('unit-1');
    expect(rooms).toHaveLength(5);
    expect(rooms.every(({ unitId }) => unitId === 'unit-1')).toBe(true);
  });

  it('cria, edita e exclui unidade sem salas vinculadas', async () => {
    const services = createLocalStorageServices();
    const created = await services.catalog.createUnit({
      name: '  Unidade Norte  ',
      address: '  Rua Principal, 10  ',
      description: '  Nova unidade  ',
      imageUrl: 'data:image/png;base64,dGVzdGU=',
    });
    expect(created).toMatchObject({
      name: 'Unidade Norte',
      address: 'Rua Principal, 10',
      description: 'Nova unidade',
      availableRooms: 0,
    });

    await expect(services.catalog.updateUnit(created.id, {
      name: 'Unidade Norte Atualizada',
      address: created.address,
      description: undefined,
      imageUrl: null,
    })).resolves.toMatchObject({ name: 'Unidade Norte Atualizada', imageUrl: null });

    await expect(services.catalog.deleteUnit(created.id)).resolves.toBeUndefined();
    await expect(services.catalog.getUnitById(created.id)).resolves.toBeNull();
  });

  it('impede excluir unidade com salas vinculadas', async () => {
    const services = createLocalStorageServices();
    await expect(services.catalog.deleteUnit('unit-1')).rejects.toThrow('salas vinculadas');
  });

  it('cria, edita e exclui sala sem agendamentos vinculados', async () => {
    const services = createLocalStorageServices();
    const created = await services.catalog.createRoom({
      unitId: 'unit-1', name: '  Sala Nova  ', capacity: 7, pricePerHour: 59.9,
      amenities: [' Wi-Fi ', 'TV'], imageUrl: '/images/nova.jpg',
      imageUrls: ['/images/nova.jpg', '/images/nova-2.jpg'],
    });
    expect(created).toMatchObject({ name: 'Sala Nova', capacity: 7, amenities: ['Wi-Fi', 'TV'], imageUrl: '/images/nova.jpg' });
    await expect(services.catalog.updateRoom(created.id, { ...created, name: 'Sala Nova Premium', capacity: 9 })).resolves.toMatchObject({ name: 'Sala Nova Premium', capacity: 9 });
    await expect(services.catalog.deleteRoom(created.id)).resolves.toBeUndefined();
    await expect(services.catalog.getRoomById(created.id)).resolves.toBeNull();
  });

  it('impede excluir sala com agendamento vinculado', async () => {
    const services = createLocalStorageServices();
    await services.bookings.create({ userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-08-10', timeSlot: '09:00 - 10:00', status: 'upcoming' });
    await expect(services.catalog.deleteRoom('room-1-1')).rejects.toThrow('agendamentos vinculados');
  });

  it('cadastra usuário e rejeita e-mail duplicado', async () => {
    const services = createLocalStorageServices();
    const input = { name: 'Maria Silva', email: 'maria@example.com', profession: 'Designer', phone: '(11) 98765-4321', password: '123456' };
    await expect(services.auth.register(input)).resolves.toMatchObject({ email: input.email });
    await expect(services.auth.login(input.email, input.password)).resolves.toMatchObject({ role: 'client' });
    await expect(services.auth.register(input)).rejects.toThrow('já está cadastrado');
  });

  it('lista usuários sem senha e permite gerenciar papel e acesso', async () => {
    const services = createLocalStorageServices();
    const users = await services.users.listUsers();
    expect(users).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'seed-usuario-teste', role: 'client', active: true }),
      expect.objectContaining({ id: 'seed-administrador', role: 'admin', active: true }),
    ]));
    expect(users.some((user) => 'password' in user)).toBe(false);
    await expect(services.users.updateUserRole('seed-usuario-teste', 'secretaria')).resolves.toMatchObject({ role: 'secretaria' });
    await expect(services.users.updateUserStatus('seed-usuario-teste', false)).resolves.toMatchObject({ active: false });
    await expect(services.auth.login('teste@connect2work.com', '123456')).rejects.toThrow('conta está inativa');
  });

  it('administrador cadastra e edita todos os dados do usuário', async () => {
    const services = createLocalStorageServices();
    const created = await services.users.createUser({
      name: 'Ana Souza', email: 'ANA@EXAMPLE.COM', profession: 'Arquiteta',
      phone: '(11) 99999-0000', password: 'senha123', role: 'client', active: true,
    });
    expect(created).toMatchObject({ name: 'Ana Souza', email: 'ana@example.com', profession: 'Arquiteta', role: 'client' });
    expect('password' in created).toBe(false);

    const updated = await services.users.updateUser(created.id, {
      name: 'Ana Souza Lima', email: 'ana.lima@example.com', profession: 'Gerente',
      phone: '(11) 98888-0000', password: 'novaSenha', role: 'secretaria', active: true,
    });
    expect(updated).toMatchObject({
      name: 'Ana Souza Lima', email: 'ana.lima@example.com', profession: 'Gerente',
      phone: '(11) 98888-0000', role: 'secretaria', active: true,
    });
    await expect(services.auth.login('ana.lima@example.com', 'novaSenha')).resolves.toMatchObject({ id: created.id });
    await expect(services.users.createUser({
      name: 'Duplicada', email: 'ana.lima@example.com', password: '123456', role: 'client', active: true,
    })).rejects.toThrow('já está cadastrado');
  });

  it('protege o administrador contra perda do próprio acesso', async () => {
    const services = createLocalStorageServices();
    await services.auth.login('admin@connect2work.com', 'admin123');
    await expect(services.users.updateUserRole('seed-administrador', 'client')).rejects.toThrow('própria permissão');
    await expect(services.users.updateUserStatus('seed-administrador', false)).rejects.toThrow('própria conta');
  });

  it('oferece busca segura somente de clientes ativos', async () => {
    const services = createLocalStorageServices();
    await expect(services.auth.login('secretaria@connect2work.com', 'secretaria123'))
      .resolves.toMatchObject({ role: 'secretaria', active: true });
    const clients = await services.users.searchClients('teste');
    expect(clients).toEqual([
      expect.objectContaining({ id: 'seed-usuario-teste', email: 'teste@connect2work.com' }),
    ]);
    expect(clients.some((client) => 'password' in client || 'role' in client)).toBe(false);
  });

  it('persiste reserva vinculada ao usuário', async () => {
    const services = createLocalStorageServices();
    const booking = await services.bookings.create({ userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-08-10', timeSlot: '09:00 - 11:00', status: 'upcoming' });
    expect(booking.id).toMatch(/^booking-/);
    await expect(services.bookings.getByUserAndStatus('user-1', 'upcoming')).resolves.toHaveLength(1);
  });

  it('administrador confirma e cancela agendamentos', async () => {
    const services = createLocalStorageServices();
    const booking = await services.bookings.create({
      userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-08-10',
      timeSlot: '09:00 - 11:00', status: 'upcoming', adminStatus: 'pending', total: 160, paymentStatus: 'pending',
    });
    await expect(services.bookings.confirmBooking(booking.id)).resolves.toMatchObject({ adminStatus: 'confirmed', total: 160, paymentStatus: 'pending' });
    await expect(services.bookings.confirmPayment(booking.id)).resolves.toMatchObject({ paymentStatus: 'completed' });
    await expect(services.bookings.cancelBookingAsAdmin(booking.id, 'Solicitado pelo cliente')).resolves.toMatchObject({ status: 'cancelled', adminStatus: 'cancelled', cancellationReason: 'Solicitado pelo cliente' });
    await expect(services.bookings.confirmBooking(booking.id)).rejects.toThrow('não pode ser confirmado');
  });

  it('exige motivo no cancelamento administrativo', async () => {
    const services = createLocalStorageServices();
    const booking = await services.bookings.create({
      userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-08-10',
      timeSlot: '09:00 - 10:00', status: 'upcoming',
    });
    await expect(services.bookings.cancelBookingAsAdmin(booking.id, '  ')).rejects.toThrow('motivo');
  });

  it('não confirma pagamento de agendamento cancelado', async () => {
    const services = createLocalStorageServices();
    const booking = await services.bookings.create({
      userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-08-10',
      timeSlot: '10:00 - 11:00', status: 'upcoming', paymentStatus: 'pending',
    });
    await services.bookings.cancelBookingAsAdmin(booking.id, 'Cliente desistiu');
    await expect(services.bookings.confirmPayment(booking.id)).rejects.toThrow('cancelado');
  });

  it('registra check-in confirmado com horário e responsável', async () => {
    const checkInTime = new Date('2026-07-23T14:05:00.000Z');
    const services = createLocalStorageServices(() => checkInTime);
    const booking = await services.bookings.create({
      userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-07-23',
      timeSlot: '14:00 - 15:00', status: 'upcoming', adminStatus: 'confirmed',
    });
    await expect(services.bookings.checkInBooking(booking.id, 'seed-secretaria')).resolves.toMatchObject({
      checkedInAt: checkInTime.toISOString(),
      checkedInBy: 'seed-secretaria',
    });
    await expect(services.bookings.checkInBooking(booking.id, 'seed-secretaria')).rejects.toThrow('já foi realizado');
  });

  it('bloqueia check-in pendente ou feito por cliente', async () => {
    const services = createLocalStorageServices();
    const booking = await services.bookings.create({
      userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-08-10',
      timeSlot: '15:00 - 16:00', status: 'upcoming', adminStatus: 'pending',
    });
    await expect(services.bookings.checkInBooking(booking.id, 'seed-secretaria')).rejects.toThrow('confirmados');
    await expect(services.bookings.checkInBooking(booking.id, 'seed-usuario-teste')).rejects.toThrow('sem permissão');
  });

  it('cancela somente a reserva do usuário com pelo menos 24 horas', async () => {
    const now = new Date(2026, 6, 16, 10, 0);
    const services = createLocalStorageServices(() => now);
    const booking = await services.bookings.create({ userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-07-17', timeSlot: '10:00 - 11:00', status: 'upcoming' });

    await expect(services.bookings.cancel(booking.id, 'user-2')).rejects.toThrow('não pode cancelar');
    await expect(services.bookings.cancel(booking.id, 'user-1')).resolves.toMatchObject({ status: 'cancelled', cancelledAt: now.toISOString() });
    await expect(services.bookings.getCounts('user-1')).resolves.toEqual({ upcoming: 0, past: 0, cancelled: 1 });
  });

  it('bloqueia cancelamento com menos de 24 horas', async () => {
    const services = createLocalStorageServices(() => new Date(2026, 6, 16, 10, 1));
    const booking = await services.bookings.create({ userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-07-17', timeSlot: '10:00 - 11:00', status: 'upcoming' });
    await expect(services.bookings.cancel(booking.id, 'user-1')).rejects.toThrow('24 horas');
  });

  it('impede reserva sobreposta mesmo quando feita por outro usuário', async () => {
    const services = createLocalStorageServices();
    await services.bookings.create({
      userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-09-10',
      timeSlot: '08:00 - 09:00', status: 'upcoming',
    });
    await expect(services.bookings.create({
      userId: 'user-2', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-09-10',
      timeSlot: '08:30 - 09:30', status: 'upcoming',
    })).rejects.toThrow('já está ocupado');
  });

  it('mantém rascunho de checkout apenas na sessão', () => {
    const services = createLocalStorageServices();
    const draft = { userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-08-10', timeSlot: '09:00 - 11:00', duration: 2, total: 160 };
    services.checkout.saveDraft(draft);
    expect(services.checkout.getDraft()).toEqual(draft);
    services.checkout.clearDraft();
    expect(services.checkout.getDraft()).toBeNull();
  });

  it('cria, move, edita e exclui tarefa compartilhada', async () => {
    const now = new Date('2026-07-23T12:00:00.000Z');
    const services = createLocalStorageServices(() => now);
    const created = await services.tasks.createTask({
      title: '  Conferir recepção  ',
      description: '  Verificar materiais  ',
      assignedTo: 'seed-secretaria',
      priority: 'high',
      dueDate: '2026-07-23',
      createdBy: 'seed-administrador',
    });
    expect(created).toMatchObject({ title: 'Conferir recepção', description: 'Verificar materiais', status: 'todo' });
    await expect(services.tasks.updateTaskStatus(created.id, 'in_progress', 'seed-secretaria')).resolves.toMatchObject({ status: 'in_progress' });
    await expect(services.tasks.updateTask(created.id, {
      title: 'Conferir recepção e copa',
      description: undefined,
      assignedTo: undefined,
      priority: 'medium',
      dueDate: undefined,
    }, 'seed-administrador')).resolves.toMatchObject({ title: 'Conferir recepção e copa', assignedTo: undefined });
    await expect(services.tasks.deleteTask(created.id, 'seed-administrador')).resolves.toBeUndefined();
    await expect(services.tasks.listTasks()).resolves.not.toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id })]));
  });

  it('bloqueia responsável que não pertence à equipe administrativa', async () => {
    const services = createLocalStorageServices();
    await expect(services.tasks.createTask({
      title: 'Tarefa inválida',
      assignedTo: 'seed-usuario-teste',
      priority: 'low',
      createdBy: 'seed-administrador',
    })).rejects.toThrow('Responsável inválido');
  });

  it('impede a secretária de editar ou excluir tarefa criada por outro usuário', async () => {
    const services = createLocalStorageServices();
    const created = await services.tasks.createTask({
      title: 'Tarefa exclusiva do administrador',
      priority: 'medium',
      createdBy: 'seed-administrador',
    });
    const changedContent = {
      title: 'Alteração indevida',
      description: undefined,
      assignedTo: undefined,
      priority: 'high' as const,
      dueDate: undefined,
    };

    await expect(services.tasks.updateTask(created.id, changedContent, 'seed-secretaria')).rejects.toThrow('somente as tarefas que criou');
    await expect(services.tasks.updateTask(created.id, {
      title: created.title,
      description: created.description,
      assignedTo: created.assignedTo,
      priority: created.priority,
      dueDate: '2026-08-15',
    }, 'seed-secretaria')).rejects.toThrow('somente as tarefas que criou');
    await expect(services.tasks.deleteTask(created.id, 'seed-secretaria')).rejects.toThrow('Somente quem criou');
    await expect(services.tasks.updateTaskStatus(created.id, 'in_progress', 'seed-secretaria')).resolves.toMatchObject({ status: 'in_progress' });
  });

  it('permite à secretária editar a própria tarefa, exceto a data estimada', async () => {
    const services = createLocalStorageServices();
    const created = await services.tasks.createTask({
      title: 'Tarefa da secretária',
      priority: 'medium',
      dueDate: '2026-08-15',
      createdBy: 'seed-secretaria',
    });

    await expect(services.tasks.updateTask(created.id, {
      title: 'Tarefa revisada pela secretária',
      description: 'Conteúdo atualizado',
      assignedTo: 'seed-secretaria',
      priority: 'high',
      dueDate: created.dueDate,
    }, 'seed-secretaria')).resolves.toMatchObject({
      title: 'Tarefa revisada pela secretária',
      priority: 'high',
      dueDate: '2026-08-15',
    });
    await expect(services.tasks.updateTask(created.id, {
      title: created.title,
      description: created.description,
      assignedTo: created.assignedTo,
      priority: created.priority,
      dueDate: '2026-08-20',
    }, 'seed-secretaria')).rejects.toThrow('só pode ser definida durante a criação');
  });

  it('permite ao administrador editar e excluir tarefa criada pela secretária', async () => {
    const services = createLocalStorageServices();
    const created = await services.tasks.createTask({
      title: 'Tarefa criada pela secretária',
      priority: 'low',
      createdBy: 'seed-secretaria',
    });

    await expect(services.tasks.updateTask(created.id, {
      title: 'Tarefa revisada pelo administrador',
      description: 'Conteúdo atualizado',
      assignedTo: 'seed-administrador',
      priority: 'high',
      dueDate: '2026-08-20',
    }, 'seed-administrador')).resolves.toMatchObject({
      title: 'Tarefa revisada pelo administrador',
      priority: 'high',
    });
    await expect(services.tasks.deleteTask(created.id, 'seed-administrador')).resolves.toBeUndefined();
  });
});
