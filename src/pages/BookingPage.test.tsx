import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../state/AuthContext';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import { BookingPage } from './BookingPage';

describe('BookingPage — integração da View', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 9, 12));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    sessionStorage.clear();
    createLocalStorageServices();
    await services.auth.login('teste@connect2work.com', '123456');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function mount(Page = BookingPage) {
    await act(async () => root.render(
      <MemoryRouter initialEntries={['/agendamento?sala=room-1-1']}>
        <AuthProvider>
          <Routes>
            <Route path="/agendamento" element={<Page />} />
            <Route path="/pagamento" element={<p>Checkout aberto</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    ));
  }

  function button(selector: string) {
    const element = container.querySelector<HTMLButtonElement>(selector);
    if (!element) throw new Error(`Botão não encontrado: ${selector}`);
    return element;
  }

  async function selectPeriod() {
    await act(async () => button('.calendar__day[aria-label="10 de agosto de 2026"]').click());
    await act(async () => button('.time-button').click());
    await act(async () => button('.time-button:nth-child(2)').click());
  }

  it('seleciona período pela interface e abre checkout com valor correto', async () => {
    await mount();
    expect(container.querySelector('.room-gallery__fallback')?.textContent).toBe('Fotos em breve');
    expect(button('.booking-summary__button').disabled).toBe(true);
    expect(button('.calendar__day[aria-label="08 de agosto de 2026"]').disabled).toBe(true);
    await selectPeriod();
    expect(container.querySelector('.booking-summary')?.textContent).toContain('08:00 - 10:00');
    expect(container.querySelector('.booking-summary__total')?.textContent).toContain('160,00');
    await act(async () => button('.booking-summary__button').click());
    expect(container.textContent).toContain('Checkout aberto');
    expect(services.checkout.getDraft()).toMatchObject({ duration: 2, total: 160 });
  });

  it('navega entre meses e entre fotos sem afetar a reserva', async () => {
    const room = await services.catalog.getRoomById('room-1-1');
    if (!room) throw new Error('Sala seed ausente');
    await services.catalog.updateRoom(room.id, { ...room, imageUrl: '/one.jpg', imageUrls: ['/one.jpg', '/two.jpg'] });
    await mount();
    await act(async () => button('[aria-label="Próxima imagem"]').click());
    expect(container.querySelector('img.room-gallery__image')?.getAttribute('src')).toBe('/two.jpg');
    await act(async () => button('[aria-label="Próximo mês"]').click());
    expect(container.querySelector('.calendar__header h3')?.textContent).toBe('setembro de 2026');
    await act(async () => button('[aria-label="Mês anterior"]').click());
    await selectPeriod();
    expect(container.querySelector('img.room-gallery__image')?.getAttribute('src')).toBe('/two.jpg');
  });

});
