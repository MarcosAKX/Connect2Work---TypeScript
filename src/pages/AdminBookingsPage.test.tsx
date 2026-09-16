import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../state/AuthContext';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import type { Booking } from '../types/domain';
import { AdminBookingsPage } from './AdminBookingsPage';

describe('AdminBookingsPage — fluxos preservados', () => {
  let container: HTMLDivElement;
  let root: Root;
  const pendingId = 'booking-pending-test';
  const confirmedId = 'booking-confirmed-test';
  const originalShowModal = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  const originalClose = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'close',
  );

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 9, 12));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    // jsdom não implementa a abertura modal nativa; manter o estado open observável.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = false;
      },
    });
    localStorage.clear();
    sessionStorage.clear();
    createLocalStorageServices();
    const client = await services.auth.login(
      'teste@connect2work.com',
      '123456',
    );
    const base: Booking = {
      id: pendingId,
      userId: client.id,
      unitId: 'unit-1',
      roomId: 'room-1-1',
      date: '2026-08-09',
      timeSlot: '14:00 - 15:00',
      status: 'upcoming',
      adminStatus: 'pending',
      paymentStatus: 'pending',
      total: 80,
      createdAt: '2026-08-01T12:00:00.000Z',
    };
    localStorage.setItem(
      'c2w_mock_bookings',
      JSON.stringify([
        {
          ...base,
          id: 'booking-future-test',
          date: '2026-08-10',
          unitId: 'unit-2',
          roomId: 'room-2-1',
        },
        {
          ...base,
          id: confirmedId,
          timeSlot: '13:00 - 14:00',
          adminStatus: 'confirmed',
          paymentStatus: 'completed',
        },
        base,
      ]),
    );
    await services.auth.login('admin@connect2work.com', 'admin123');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    if (originalShowModal)
      Object.defineProperty(
        HTMLDialogElement.prototype,
        'showModal',
        originalShowModal,
      );
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (originalClose)
      Object.defineProperty(
        HTMLDialogElement.prototype,
        'close',
        originalClose,
      );
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function mount(query = '') {
    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={['/admin/agendamentos' + query]}>
          <AuthProvider>
            <AdminBookingsPage />
          </AuthProvider>
        </MemoryRouter>,
      ),
    );
  }
  function element<T extends Element>(selector: string): T {
    const found = container.querySelector<T>(selector);
    if (!found) throw new Error(`Elemento ausente: ${selector}`);
    return found;
  }
  async function click(selector: string) {
    await act(async () => element<HTMLButtonElement>(selector).click());
  }
  async function change(selector: string, value: string) {
    const input = element<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(selector);
    const prototype =
      input instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : input instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(
        input,
        value,
      );
      input.dispatchEvent(
        new Event(input instanceof HTMLSelectElement ? 'change' : 'input', {
          bubbles: true,
        }),
      );
    });
  }
  function rows() {
    return [...container.querySelectorAll('tbody tr')];
  }
  async function saved(id: string) {
    return (await services.bookings.getAll()).find(
      (booking) => booking.id === id,
    );
  }

  it('abre no dia atual, ordena por horário e permite filtrar/limpar o histórico', async () => {
    await mount();
    expect(rows()).toHaveLength(2);
    expect(rows()[0]?.querySelector('code')?.title).toBe(confirmedId);
    expect(element<HTMLInputElement>('input[type="date"]').value).toBe(
      '2026-08-09',
    );
    await click('.admin-bookings-show-all');
    expect(rows()).toHaveLength(3);
    await change('.admin-bookings-search input', 'inexistente');
    expect(rows()).toHaveLength(0);
    await click('.admin-bookings-empty button');
    expect(rows()).toHaveLength(3);
    await change('.admin-bookings-filters select', 'unit-2');
    expect(rows()).toHaveLength(1);
    expect(rows()[0]?.querySelector('code')?.title).toBe('booking-future-test');
  });

  it('aplica intervalo/unidade vindos do dashboard e abre criação via URL', async () => {
    await mount('?de=2026-08-10&ate=2026-08-10&unidade=unit-2&novo=1');
    expect(rows()).toHaveLength(1);
    expect(
      element<HTMLDialogElement>('.admin-bookings-modal--create').open,
    ).toBe(true);
    expect(element<HTMLInputElement>('input[type="date"]').value).toBe(
      '2026-08-10',
    );
  });

  it.each(['admin', 'secretaria'] as const)(
    'confirma reserva e registra check-in com responsável %s',
    async (role) => {
      const staff = await services.auth.login(
        `${role}@connect2work.com`,
        role === 'admin' ? 'admin123' : 'secretaria123',
      );
      await mount();
      expect(container.textContent?.includes('Receita Total')).toBe(
        role === 'admin',
      );
      expect(
        [...container.querySelectorAll('th')].some(
          (cell) => cell.textContent === 'Valor',
        ),
      ).toBe(role === 'admin');
      await click('.is-confirm');
      expect(await saved(pendingId)).toMatchObject({
        adminStatus: 'confirmed',
      });
      await click('.admin-bookings-checkin.is-action');
      expect(await saved(confirmedId)).toMatchObject({
        checkedInBy: staff.id,
        checkedInAt: '2026-08-09T15:00:00.000Z',
      });
      expect(container.textContent).toContain('Chegou às');
      expect(container.querySelector('[role="status"]')).not.toBeNull();
      await act(async () => vi.advanceTimersByTime(5000));
      expect(container.querySelector('[role="status"]')).toBeNull();
    },
  );

  it('só confirma pagamento após confirmação no modal', async () => {
    await mount();
    await click('.admin-bookings-payment.is-action');
    expect((await saved(pendingId))?.paymentStatus).toBe('pending');
    await click(
      'dialog[aria-labelledby="confirm-payment-title"] .btn-secondary',
    );
    expect((await saved(pendingId))?.paymentStatus).toBe('pending');
    await click('.admin-bookings-payment.is-action');
    await click('dialog[aria-labelledby="confirm-payment-title"] .btn-primary');
    expect((await saved(pendingId))?.paymentStatus).toBe('completed');
    expect(
      container.querySelector(
        'dialog[aria-labelledby="confirm-payment-title"]',
      ),
    ).toBeNull();
  });

  it('exige motivo para cancelar e permite consultar o motivo persistido', async () => {
    await mount();
    await click('.is-cancel');
    await click('.admin-bookings-danger');
    expect(
      container.querySelector('dialog [role="alert"]')?.textContent,
    ).toContain('Informe o motivo');
    expect((await saved(confirmedId))?.adminStatus).toBe('confirmed');
    await change('dialog textarea', '  Cliente solicitou  ');
    await click('.admin-bookings-danger');
    expect(await saved(confirmedId)).toMatchObject({
      adminStatus: 'cancelled',
      cancellationReason: 'Cliente solicitou',
    });
    await click('.admin-bookings-badge.is-cancelled');
    expect(container.querySelector('blockquote')?.textContent).toBe(
      'Cliente solicitou',
    );
  });

  it('mantém modal e erro quando confirmação de pagamento falha', async () => {
    await mount();
    await click('.admin-bookings-payment.is-action');
    // Estado externo mudou após abrir o modal: usa validação real do gateway.
    await services.bookings.cancelBookingAsAdmin(
      pendingId,
      'Cancelado em outra sessão',
    );
    await click('dialog[aria-labelledby="confirm-payment-title"] .btn-primary');
    expect(
      element<HTMLDialogElement>(
        'dialog[aria-labelledby="confirm-payment-title"]',
      ).open,
    ).toBe(true);
    expect(
      container.querySelector('dialog [role="alert"]')?.textContent,
    ).toContain('cancelado');
    expect((await saved(pendingId))?.paymentStatus).toBe('pending');
  });

  it('cria reserva pelo formulário, preservando duração e pagamento', async () => {
    await mount();
    await click('.admin-bookings-new');
    await click('.admin-booking-client-results input');
    await change(
      '.admin-booking-form__grid label:nth-child(1) select',
      'unit-1',
    );
    await change(
      '.admin-booking-form__grid label:nth-child(2) select',
      'room-1-1',
    );
    await change('.admin-booking-form__grid input[type="date"]', '2026-08-11');
    await change(
      '.admin-booking-form__grid label:nth-child(4) select',
      '08:00',
    );
    await change(
      '.admin-booking-form__grid label:nth-child(5) select',
      '09:00',
    );
    expect(
      element<HTMLInputElement>(
        '.admin-booking-form__grid input[inputmode="decimal"]',
      ).value,
    ).toBe('80');
    await click('.admin-bookings-modal--create .btn-primary');
    const created = (await services.bookings.getAll()).find(
      (booking) => booking.date === '2026-08-11',
    );
    expect(created).toMatchObject({
      timeSlot: '08:00 - 09:00',
      total: 80,
      adminStatus: 'confirmed',
      paymentStatus: 'pending',
    });
    expect(
      element<HTMLDialogElement>('.admin-bookings-modal--create').open,
    ).toBe(false);
    await click('.admin-bookings-show-all');
    expect(rows()).toHaveLength(4);
  });
});
