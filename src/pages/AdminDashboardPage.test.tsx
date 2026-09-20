import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../state/AuthContext';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import type { Booking } from '../types/domain';
import { AdminDashboardPage } from './AdminDashboardPage';

describe('AdminDashboardPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  let bookings: Booking[];
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 18, 12));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    createLocalStorageServices();
    const client = await services.auth.login('teste@connect2work.com', '123456');
    await services.auth.login('admin@connect2work.com', 'admin123');
    bookings = Array.from({ length: 5 }, (_, index) => ({
      id: 'booking-' + index, userId: client.id, unitId: 'unit-1', roomId: 'room-1-1',
      date: '2026-09-18', timeSlot: String(8 + index).padStart(2, '0') + ':00 - ' + String(9 + index).padStart(2, '0') + ':00',
      status: 'upcoming', adminStatus: index === 0 ? 'pending' : 'confirmed',
      paymentStatus: index === 0 ? 'pending' : 'completed', createdAt: '2026-09-01T12:00:00Z',
      checkedInAt: index === 1 ? '2026-09-18T12:00:00Z' : undefined,
    }));
    bookings.push(
      { ...bookings[0]!, id: 'future', date: '2026-09-20', adminStatus: 'confirmed', paymentStatus: 'completed' },
      { ...bookings[0]!, id: 'cancelled', unitId: 'unit-2', date: '2026-09-19', status: 'cancelled', adminStatus: 'cancelled' },
    );
    vi.spyOn(services.bookings, 'getAll').mockImplementation(async () => bookings);
    vi.spyOn(services.tasks, 'listTasks').mockResolvedValue([]);
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
  async function mount() {
    await act(async () => root.render(<MemoryRouter><AuthProvider><AdminDashboardPage /></AuthProvider></MemoryRouter>));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  async function click(selector: string) {
    await act(async () => element<HTMLButtonElement>(selector).click());
  }
  async function unit(value: string) {
    const select = element<HTMLSelectElement>('select');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, value);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  it('mostra métricas, alertas, nomes e quatro reservas por agenda', async () => {
    await mount();
    expect([...container.querySelectorAll('.admin-overview-strip strong')].map(node => node.textContent)).toEqual(['2', '10', '3', '5', '1']);
    expect(container.querySelectorAll('.is-today li')).toHaveLength(4);
    expect(container.querySelectorAll('.is-upcoming li')).toHaveLength(1);
    expect(element('.admin-booking-list__subject').textContent).toContain('Usuário Teste');
    expect(container.textContent).toContain('3 chegadas aguardadas');
    expect(container.textContent).toContain('Em andamento');
    expect(container.textContent).toContain('Pendente');
    expect(element('.admin-dashboard__shortcuts a').getAttribute('href')).toBe('/admin/agendamentos?novo=1');
    expect(element('.admin-attention a').getAttribute('href')).toBe('/admin/agendamentos');
  });
  it('alterna período e filtra unidade com links de intervalo correto', async () => {
    await mount();
    expect(container.querySelectorAll('.admin-chart-months > a')).toHaveLength(6);
    expect(element('.admin-chart-months > a:last-child').getAttribute('aria-label')).toContain('6 ativas e 1 canceladas');
    await click('.admin-chart-range button:last-child');
    expect(container.querySelectorAll('.admin-chart-months > a')).toHaveLength(12);
    await unit('unit-2');
    const link = element('.admin-chart-months > a:last-child');
    expect(link.getAttribute('aria-label')).toContain('0 ativas e 1 canceladas');
    expect(link.getAttribute('href')).toBe('/admin/agendamentos?de=2026-09-01&ate=2026-09-30&unidade=unit-2');
    expect(element('.admin-chart-months > a:nth-child(5)').getAttribute('href')).toContain('ate=2026-02-28');
  });
  it('mantém pelo menos uma série visível', async () => {
    await mount();
    await click('.admin-chart-legend .is-active');
    expect(element('.admin-chart-legend .is-active').getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('.admin-chart-bar')).toBeNull();
    await click('.admin-chart-legend .is-cancelled');
    expect(element('.admin-chart-legend .is-cancelled').getAttribute('aria-pressed')).toBe('true');
    await click('.admin-chart-legend .is-active');
    await click('.admin-chart-legend .is-cancelled');
    expect(container.querySelector('.admin-chart-line.is-cancelled')).toBeNull();
  });
  it('mostra estados vazios sem inventar reservas', async () => {
    bookings = [];
    await mount();
    expect(container.textContent).toContain('Nenhum agendamento para hoje');
    expect(container.textContent).toContain('Nenhum agendamento nos próximos dias');
    expect(element('.admin-chart-months > a:last-child').getAttribute('aria-label')).toContain('0 ativas e 0 canceladas');
  });
  it('recupera carregamento após erro', async () => {
    vi.mocked(services.bookings.getAll).mockRejectedValueOnce(new Error('Teste'));
    await mount();
    expect(element('[role="alert"]').textContent).toContain('Não foi possível carregar');
    await click('.admin-dashboard__error button');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelectorAll('.admin-chart-months > a')).toHaveLength(6);
  });
});
