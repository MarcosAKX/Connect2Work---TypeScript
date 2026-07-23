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

  it('protege o administrador contra perda do próprio acesso', async () => {
    const services = createLocalStorageServices();
    await services.auth.login('admin@connect2work.com', 'admin123');
    await expect(services.users.updateUserRole('seed-administrador', 'client')).rejects.toThrow('própria permissão');
    await expect(services.users.updateUserStatus('seed-administrador', false)).rejects.toThrow('própria conta');
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
      timeSlot: '09:00 - 11:00', status: 'upcoming', adminStatus: 'pending', total: 160,
    });
    await expect(services.bookings.confirmBooking(booking.id)).resolves.toMatchObject({ adminStatus: 'confirmed', total: 160 });
    await expect(services.bookings.cancelBookingAsAdmin(booking.id)).resolves.toMatchObject({ status: 'cancelled', adminStatus: 'cancelled' });
    await expect(services.bookings.confirmBooking(booking.id)).rejects.toThrow('não pode ser confirmado');
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

  it('mantém rascunho de checkout apenas na sessão', () => {
    const services = createLocalStorageServices();
    const draft = { userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-08-10', timeSlot: '09:00 - 11:00', duration: 2, total: 160 };
    services.checkout.saveDraft(draft);
    expect(services.checkout.getDraft()).toEqual(draft);
    services.checkout.clearDraft();
    expect(services.checkout.getDraft()).toBeNull();
  });
});
