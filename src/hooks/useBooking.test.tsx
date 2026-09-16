import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStorageServices } from '../services/local-storage';
import type { AppServices } from '../services/contracts';
import type { User } from '../types/domain';
import { useBooking, type BookingViewModel } from './useBooking';

describe('useBooking — fluxo do agendamento', () => {
  let gateway: AppServices;
  let user: User;
  let root: Root;
  let container: HTMLDivElement;
  let model: BookingViewModel;
  const navigate = vi.fn();

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 9, 12));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    sessionStorage.clear();
    navigate.mockReset();
    gateway = createLocalStorageServices();
    user = await gateway.auth.login('teste@connect2work.com', '123456');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function mount(roomId: string | null = 'room-1-1') {
    function Harness() {
      model = useBooking({ roomId, user, navigate }, gateway);
      return null;
    }
    await act(async () => root.render(<Harness />));
  }

  async function selectHour(index = 0) {
    await act(async () => model.selectDate(new Date(2026, 7, 10)));
    await act(async () => model.selectTimeSlot(index));
  }

  async function configurePlan(balance: number, renewal = '2026-09-01') {
    user = {
      ...user,
      hasHoursPlan: true,
      hoursBalance: balance,
      hoursPlanRenewsOn: renewal,
    };
    vi.spyOn(gateway.auth, 'getUserById').mockResolvedValue(user);
  }

  it('carrega sala/unidade, seleciona 1h, amplia e limpa período ao trocar data', async () => {
    await mount();
    expect(model.room?.id).toBe('room-1-1');
    expect(model.unit?.id).toBe('unit-1');
    expect(model.slots.every((slot) => slot.unavailable)).toBe(true);
    await selectHour();
    expect(model.selectedSlot).toBe('08:00 - 09:00');
    expect(model.duration).toBe(1);
    expect(model.total).toBe(80);
    await act(async () => model.selectTimeSlot(2));
    expect(model.duration).toBe(3);
    expect(model.total).toBe(240);
    await act(async () => model.selectDate(new Date(2026, 7, 11)));
    expect(model.duration).toBe(0);
    expect(model.canContinue).toBe(false);
  });

  it('impede seleção em data passada', async () => {
    await mount();
    await act(async () => model.selectDate(new Date(2026, 7, 8)));
    await act(async () => model.selectTimeSlot(0));
    expect(model.slots.every((slot) => slot.unavailable)).toBe(true);
    expect(model.duration).toBe(0);
  });

  it('não amplia o período através de uma hora ocupada', async () => {
    await gateway.bookings.create({
      userId: user.id,
      roomId: 'room-1-1',
      unitId: 'unit-1',
      date: '2026-08-10',
      timeSlot: '09:00 - 10:00',
      status: 'upcoming',
    });
    await mount();
    await selectHour();
    expect(model.slots[1]?.unavailable).toBe(true);
    await act(async () => model.selectTimeSlot(2));
    expect(model.selectedSlot).toBe('10:00 - 11:00');
    expect(model.duration).toBe(1);
  });

  it('revalida conflito surgido antes de continuar e não gera checkout', async () => {
    await mount();
    await selectHour();
    await gateway.bookings.create({
      userId: user.id,
      roomId: 'room-1-1',
      unitId: 'unit-1',
      date: '2026-08-10',
      timeSlot: '08:00 - 09:00',
      status: 'upcoming',
    });
    await act(async () => model.continueToPayment());
    expect(model.submitError).toContain('não está mais disponível');
    expect(model.duration).toBe(0);
    expect(gateway.checkout.getDraft()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('salva rascunho e navega para pagamento sem plano', async () => {
    await mount();
    await selectHour();
    await act(async () => model.continueToPayment());
    expect(gateway.checkout.getDraft()).toMatchObject({
      date: '2026-08-10',
      timeSlot: '08:00 - 09:00',
      duration: 1,
      total: 80,
    });
    expect(navigate).toHaveBeenCalledWith('/pagamento');
    expect(model.isSaving).toBe(false);
  });

  it('plano parcial desconta horas e cobra somente excedente', async () => {
    await configurePlan(1);
    await mount();
    await selectHour();
    await act(async () => model.selectTimeSlot(1));
    expect(model.planBalanceText).toBe('0h restantes');
    expect(model.total).toBe(80);
    await act(async () => model.continueToPayment());
    expect(gateway.checkout.getDraft()).toMatchObject({
      duration: 2,
      hoursFromPlan: 1,
      hoursToPay: 1,
      total: 80,
    });
  });

  it('plano completo confirma reserva diretamente', async () => {
    await configurePlan(5);
    const create = vi
      .spyOn(gateway.bookings, 'create')
      .mockImplementation(async (input) => ({
        ...input,
        id: 'confirmed-booking',
        createdAt: new Date().toISOString(),
      }));
    await mount();
    await selectHour();
    expect(model.continueLabel).toBe('Confirmar com Plano');
    expect(model.planBalanceText).toBe('4h restantes');
    await act(async () => model.continueToPayment());
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 0,
        hoursFromPlan: 1,
        adminStatus: 'confirmed',
      }),
    );
    expect(navigate).toHaveBeenCalledWith(
      '/pagamento-confirmado',
      expect.objectContaining({
        state: expect.objectContaining({
          bookingId: 'confirmed-booking',
          duration: 1,
        }),
      }),
    );
    expect(gateway.checkout.getDraft()).toBeNull();
  });

  it('plano vencido não reduz preço e falha do gateway exibe erro recuperável', async () => {
    await configurePlan(5, '2026-08-08');
    await mount();
    await selectHour();
    expect(model.total).toBe(80);
    expect(model.planBalanceDescription).toBe('Plano aguardando renovação');
    vi.spyOn(gateway.bookings, 'getAll').mockRejectedValueOnce(
      new Error('offline'),
    );
    await act(async () => model.continueToPayment());
    expect(model.submitError).toContain('Tente novamente');
    expect(model.isSaving).toBe(false);
    expect(model.canContinue).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('identifica sala inexistente para redirecionamento', async () => {
    await mount('missing');
    expect(model.room).toBeNull();
    expect(model.unit).toBeNull();
  });
});
