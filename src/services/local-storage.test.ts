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
    expect(services.auth.getCurrentUser()?.id).toBe(user.id);
    await services.auth.logout();
    expect(services.auth.getCurrentUser()).toBeNull();
  });

  it('mantém catálogo tipado por unidade', async () => {
    const services = createLocalStorageServices();
    const rooms = await services.catalog.getRoomsByUnitId('unit-1');
    expect(rooms).toHaveLength(5);
    expect(rooms.every(({ unitId }) => unitId === 'unit-1')).toBe(true);
  });

  it('cadastra usuário e rejeita e-mail duplicado', async () => {
    const services = createLocalStorageServices();
    const input = { name: 'Maria Silva', email: 'maria@example.com', profession: 'Designer', phone: '(11) 98765-4321', password: '123456' };
    await expect(services.auth.register(input)).resolves.toMatchObject({ email: input.email });
    await expect(services.auth.register(input)).rejects.toThrow('já está cadastrado');
  });

  it('persiste reserva vinculada ao usuário', async () => {
    const services = createLocalStorageServices();
    const booking = await services.bookings.create({ userId: 'user-1', unitId: 'unit-1', roomId: 'room-1-1', date: '2026-08-10', timeSlot: '09:00 - 11:00', status: 'upcoming' });
    expect(booking.id).toMatch(/^booking-/);
    await expect(services.bookings.getByUserAndStatus('user-1', 'upcoming')).resolves.toHaveLength(1);
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
