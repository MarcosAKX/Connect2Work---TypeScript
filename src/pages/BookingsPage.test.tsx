import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../state/AuthContext';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import type { Booking } from '../types/domain';
import { BookingsPage } from './BookingsPage';

describe('BookingsPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  let userId: string;
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 18, 12));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    createLocalStorageServices();
    userId = (await services.auth.login('teste@connect2work.com', '123456')).id;
    const base: Booking = {
      id: 'boundary', userId, unitId: 'unit-1', roomId: 'room-1-1',
      date: '2026-09-19', timeSlot: '12:00 - 13:00', status: 'upcoming',
      adminStatus: 'confirmed', createdAt: '2026-09-01T12:00:00Z',
    };
    localStorage.setItem('c2w_mock_bookings', JSON.stringify([
      base,
      { ...base, id: 'too-soon', timeSlot: '11:00 - 12:00' },
      { ...base, id: 'past', date: '2026-09-17', status: 'past' },
      { ...base, id: 'cancelled', status: 'cancelled' },
      { ...base, id: 'another-user', userId: 'someone-else' },
    ]));
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
    await act(async () => root.render(<MemoryRouter><AuthProvider><BookingsPage /></AuthProvider></MemoryRouter>));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  async function click(selector: string) {
    await act(async () => element<HTMLButtonElement>(selector).click());
  }
  it('lista somente reservas do usuário e preserva contagens e categorias', async () => {
    await mount();
    expect(container.querySelectorAll('.booking-card')).toHaveLength(2);
    expect([...container.querySelectorAll('.bookings-tab__count')].map(node => node.textContent)).toEqual(['(2)', '(1)', '(1)']);
    expect(container.textContent).toContain('Sala Executive');
    await click('[role="tab"]:nth-child(2)');
    expect(container.querySelectorAll('.booking-card')).toHaveLength(1);
    expect(container.querySelector('.booking-card__actions')).toBeNull();
    await click('[role="tab"]:nth-child(3)');
    expect(container.querySelectorAll('.booking-card')).toHaveLength(1);
  });
  it('permite cancelar exatamente em 24h e bloqueia abaixo desse limite', async () => {
    const cancel = vi.spyOn(services.bookings, 'cancel');
    await mount();
    expect(container.querySelectorAll('.booking-action-danger--outline')).toHaveLength(1);
    expect(container.querySelectorAll('.booking-card__restriction')).toHaveLength(1);
    await click('.booking-action-danger--outline');
    await click('.booking-action-secondary');
    expect(cancel).not.toHaveBeenCalled();
    await click('.booking-action-danger--outline');
    await click('.booking-cancel-confirm .booking-action-danger');
    expect(cancel).toHaveBeenCalledWith('boundary', userId);
    expect(container.querySelectorAll('.booking-card')).toHaveLength(1);
    expect(element('[role="status"]').textContent).toContain('cancelado com sucesso');
    expect([...container.querySelectorAll('.bookings-tab__count')].map(node => node.textContent)).toEqual(['(1)', '(1)', '(2)']);
    await act(async () => vi.advanceTimersByTime(5000));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
  it('preserva reserva e confirmação quando cancelamento falha', async () => {
    vi.spyOn(services.bookings, 'cancel').mockRejectedValueOnce(new Error('Falha de teste'));
    await mount();
    await click('.booking-action-danger--outline');
    await click('.booking-cancel-confirm .booking-action-danger');
    expect(element('[role="alert"]').textContent).toBe('Falha de teste');
    expect(container.querySelectorAll('.booking-card')).toHaveLength(2);
    expect(element<HTMLButtonElement>('.booking-cancel-confirm .booking-action-danger').disabled).toBe(false);
  });
  it('navega abas por teclado e move foco', async () => {
    await mount();
    for (const [key, index] of [['End', 3], ['ArrowRight', 1], ['ArrowLeft', 3], ['Home', 1]] as const) {
      const active = element('[role="tab"][aria-selected="true"]');
      await act(async () => active.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
      expect(document.activeElement).toBe(element('[role="tab"]:nth-child(' + index + ')'));
      expect(element('[role="tab"]:nth-child(' + index + ')').getAttribute('aria-selected')).toBe('true');
    }
  });
  it('mostra estado vazio e link para reservar', async () => {
    localStorage.setItem('c2w_mock_bookings', '[]');
    await mount();
    expect(container.textContent).toContain('Nenhum agendamento');
    expect(element('.bookings-empty a').getAttribute('href')).toBe('/unidades');
  });
});
