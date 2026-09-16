import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../state/AuthContext';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import type { Booking } from '../types/domain';
import { AdminDailyPanelPage } from './AdminDailyPanelPage';

describe('AdminDailyPanelPage — operação diária', () => {
  let container: HTMLDivElement;
  let root: Root;
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
    // jsdom não implementa showModal/close; simular somente a superfície nativa.
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
      id: 'present',
      userId: client.id,
      unitId: 'unit-1',
      roomId: 'room-1-1',
      date: '2026-08-09',
      timeSlot: '11:00 - 13:00',
      status: 'upcoming',
      adminStatus: 'confirmed',
      paymentStatus: 'completed',
      total: 160,
      createdAt: '2026-08-01T12:00:00.000Z',
    };
    const records: Booking[] = [
      {
        ...base,
        id: 'waiting',
        timeSlot: '16:00 - 17:00',
        unitId: 'unit-2',
        roomId: 'room-2-1',
      },
      {
        ...base,
        id: 'pay',
        timeSlot: '14:00 - 15:00',
        paymentStatus: 'pending',
      },
      { ...base, checkedInAt: new Date(2026, 7, 9, 10, 55).toISOString() },
      {
        ...base,
        id: 'past',
        timeSlot: '09:00 - 10:00',
        checkedInAt: new Date(2026, 7, 9, 8, 55).toISOString(),
      },
      {
        ...base,
        id: 'cancelled',
        timeSlot: '10:00 - 11:00',
        status: 'cancelled',
        adminStatus: 'cancelled',
      },
      {
        ...base,
        id: 'pending',
        timeSlot: '15:00 - 16:00',
        adminStatus: 'pending',
      },
      { ...base, id: 'tomorrow', date: '2026-08-10' },
      { ...base, id: 'seventh-day', date: '2026-08-16' },
      { ...base, id: 'eighth-day', date: '2026-08-17' },
      {
        ...base,
        id: 'tomorrow-cancelled',
        date: '2026-08-10',
        status: 'cancelled',
        adminStatus: 'cancelled',
      },
    ];
    localStorage.setItem('c2w_mock_bookings', JSON.stringify(records));
    await services.auth.login('secretaria@connect2work.com', 'secretaria123');
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

  async function mount() {
    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={['/admin/painel-do-dia']}>
          <AuthProvider>
            <AdminDailyPanelPage />
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
    const input = element<HTMLInputElement | HTMLSelectElement>(selector);
    const prototype =
      input instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
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
  function times() {
    return [
      ...container.querySelectorAll('.admin-day-agenda__list time strong'),
    ].map((node) => node.textContent);
  }
  function metric(index: number) {
    return element(`.admin-day-metrics article:nth-child(${index}) strong`)
      .textContent;
  }
  async function saved(id: string) {
    return (await services.bookings.getAll()).find(
      (booking) => booking.id === id,
    );
  }

  it('mostra agenda cronológica e métricas completas sem misturar presença com check-in', async () => {
    await mount();
    expect(times()).toEqual([
      '09:00',
      '10:00',
      '11:00',
      '14:00',
      '15:00',
      '16:00',
    ]);
    expect(metric(1)).toBe('1');
    expect(metric(2)).toBe('1');
    expect(metric(3)).toBe('2 de 6');
    expect(metric(4)).toBe('14:00');
    await change('.admin-daily-filters__search input', 'inexistente');
    expect(times()).toEqual([]);
    expect(container.textContent).toContain(
      'Nenhuma reserva corresponde aos filtros.',
    );
    expect(metric(1)).toBe('1');
    expect(metric(3)).toBe('2 de 6');
    await click('.admin-day-empty button');
    expect(times()).toHaveLength(6);
    await change('.admin-daily-filters label:nth-child(2) select', 'unit-2');
    expect(times()).toEqual(['16:00']);
  });

  it.each([
    ['waiting', ['14:00', '16:00']],
    ['present', ['11:00']],
    ['payment', ['14:00']],
    ['checked-in', ['09:00', '11:00']],
    ['cancelled', ['10:00']],
  ])('filtra situação %s sem alterar métricas', async (filter, expected) => {
    await mount();
    await change(
      '.admin-daily-filters label:nth-child(3) select',
      String(filter),
    );
    expect(times()).toEqual(expected);
    expect(metric(3)).toBe('2 de 6');
  });

  it.each([
    ['morning', ['09:00', '10:00', '11:00']],
    ['afternoon', ['14:00', '15:00', '16:00']],
    ['next', ['14:00', '15:00']],
  ])('filtra período %s', async (filter, expected) => {
    await mount();
    await change(
      '.admin-daily-filters label:nth-child(4) select',
      String(filter),
    );
    expect(times()).toEqual(expected);
  });

  it('atualiza presença no fim do intervalo sem apagar o check-in', async () => {
    await mount();
    await change('.admin-daily-filters label:nth-child(3) select', 'present');
    await act(async () => vi.advanceTimersByTime(60 * 60 * 1000));
    expect(times()).toEqual([]);
    expect(metric(1)).toBe('0');
    expect(metric(3)).toBe('2 de 6');
    expect(
      container.querySelector('.admin-daily-page__intro strong')?.textContent,
    ).toBe('13:00');
  });

  it.each(['admin', 'secretaria'] as const)(
    'pagamento e check-in persistem para %s',
    async (role) => {
      const staff = await services.auth.login(
        `${role}@connect2work.com`,
        role === 'admin' ? 'admin123' : 'secretaria123',
      );
      await mount();
      await click('.admin-day-action .is-payment');
      expect((await saved('pay'))?.paymentStatus).toBe('pending');
      await click('dialog .btn-secondary');
      expect((await saved('pay'))?.paymentStatus).toBe('pending');
      await click('.admin-day-attention .btn-primary');
      await click('dialog .btn-primary');
      expect((await saved('pay'))?.paymentStatus).toBe('completed');
      expect(metric(2)).toBe('0');
      expect(container.querySelector('dialog')).toBeNull();
      await click('.admin-day-action .is-checkin');
      expect(await saved('pay')).toMatchObject({
        checkedInBy: staff.id,
        checkedInAt: new Date(2026, 7, 9, 12).toISOString(),
      });
      expect(metric(3)).toBe('3 de 6');
      // Chegou antes do horário, mas ainda não está ocupando a sala.
      expect(metric(1)).toBe('1');
      expect(container.querySelector('[role="status"]')).not.toBeNull();
      await act(async () => vi.advanceTimersByTime(5000));
      expect(container.querySelector('[role="status"]')).toBeNull();
      await click('.admin-day-attention .btn-secondary');
      expect((await saved('waiting'))?.checkedInBy).toBe(staff.id);
    },
  );

  it('mantém erro e modal quando reserva é cancelada antes do pagamento', async () => {
    await mount();
    await click('.admin-day-action .is-payment');
    await services.bookings.cancelBookingAsAdmin(
      'pay',
      'Cancelado em outra sessão',
    );
    await click('dialog .btn-primary');
    expect(element<HTMLDialogElement>('dialog').open).toBe(true);
    expect(
      container.querySelector('dialog [role="alert"]')?.textContent,
    ).toContain('cancelado');
    await click('dialog .btn-secondary');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect((await saved('pay'))?.paymentStatus).toBe('pending');
  });

  it('conta sete dias sem cancelados e mantém links com datas corretas', async () => {
    await mount();
    const links = [
      ...container.querySelectorAll<HTMLAnchorElement>(
        '.admin-day-upcoming__days a',
      ),
    ];
    expect(links).toHaveLength(7);
    expect(
      links.map((link) => link.querySelector('strong')?.textContent),
    ).toEqual([
      '1 reserva',
      '0 reservas',
      '0 reservas',
      '0 reservas',
      '0 reservas',
      '0 reservas',
      '1 reserva',
    ]);
    expect(links[0]?.getAttribute('href')).toBe(
      '/admin/agendamentos?de=2026-08-10&ate=2026-08-10',
    );
    expect(links[6]?.getAttribute('href')).toBe(
      '/admin/agendamentos?de=2026-08-16&ate=2026-08-16',
    );
    expect(
      element<HTMLAnchorElement>(
        '.admin-day-upcoming .admin-day-section-footer',
      ).getAttribute('href'),
    ).toBe('/admin/agendamentos?de=2026-08-10&ate=2026-08-16');
  });

  it('exibe estado vazio e nenhuma pendência quando não há reservas', async () => {
    localStorage.setItem('c2w_mock_bookings', '[]');
    await mount();
    expect(container.textContent).toContain('Nenhum agendamento para hoje.');
    expect(container.textContent).toContain(
      'Nenhuma pendência operacional agora.',
    );
    expect(metric(4)).toBe('—');
    expect(metric(3)).toBe('0 de 0');
  });
});
