import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentConfirmation } from '../types/domain';
import { PaymentConfirmationPage } from './PaymentConfirmationPage';

const confirmation: PaymentConfirmation = {
  bookingId: 'booking-test', roomName: 'Sala Focus', unitName: 'Connect2Work I',
  date: '2026-09-22', timeSlot: '08:00 - 09:00', duration: 1,
};

describe('PaymentConfirmationPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  async function mount(state: PaymentConfirmation | null = confirmation) {
    await act(async () => root.render(
      <MemoryRouter initialEntries={[{ pathname: '/pagamento-confirmado', state }]}><Routes>
        <Route path="/pagamento-confirmado" element={<PaymentConfirmationPage />} />
        <Route path="/meus-agendamentos" element={<p>Meus agendamentos</p>} />
        <Route path="/unidades" element={<p>Escolher unidade</p>} />
      </Routes></MemoryRouter>,
    ));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  it.each([null, { ...confirmation, bookingId: '' }])('redireciona confirmação ausente/inválida', async (state) => {
    await mount(state);
    expect(container.textContent).toBe('Meus agendamentos');
  });
  it.each([1, 2])('apresenta detalhes e duração de %s hora(s)', async (duration) => {
    await mount({ ...confirmation, duration });
    expect(element('[role="status"]').textContent).toBe('Pagamento aprovado');
    expect(element('h1').textContent).toBe('Agendamento confirmado!');
    expect([...container.querySelectorAll('dd')].map((node) => node.textContent)).toEqual([
      'Sala Focus · Connect2Work I', '22/09/2026', `08:00 - 09:00 (${duration} ${duration === 1 ? 'hora' : 'horas'})`,
    ]);
    expect(container.textContent).toContain('será habilitado após a integração');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
  });
  it.each([
    ['a.btn-primary', 'Meus agendamentos'],
    ['a.confirmation-secondary-action', 'Escolher unidade'],
  ])('navega pelo atalho %s', async (selector, destination) => {
    await mount();
    await act(async () => element<HTMLAnchorElement>(selector).click());
    expect(container.textContent).toBe(destination);
  });
});
