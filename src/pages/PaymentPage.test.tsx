import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import { AuthProvider } from '../state/AuthContext';
import type { CheckoutDraft } from '../types/domain';
import { PaymentPage } from './PaymentPage';

function Confirmation() {
  const location = useLocation();
  return <output>{JSON.stringify(location.state)}</output>;
}

describe('PaymentPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  let draft: CheckoutDraft;
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 20, 10));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    sessionStorage.clear();
    createLocalStorageServices();
    const user = await services.auth.login('teste@connect2work.com', '123456');
    localStorage.setItem('c2w_mock_bookings', '[]');
    draft = { userId: user.id, unitId: 'unit-1', roomId: 'room-1-1', date: '2026-09-22', timeSlot: '12:00 - 14:00', duration: 2, total: 160 };
    services.checkout.saveDraft(draft);
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
    await act(async () => root.render(
      <MemoryRouter initialEntries={['/pagamento']}><AuthProvider><Routes>
        <Route path="/pagamento" element={<PaymentPage />} />
        <Route path="/unidades" element={<p>Destino unidades</p>} />
        <Route path="/pagamento-confirmado" element={<Confirmation />} />
      </Routes></AuthProvider></MemoryRouter>,
    ));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  async function click(selector: string) {
    await act(async () => element<HTMLButtonElement>(selector).click());
  }
  async function submit() {
    await act(async () => element('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  }
  async function change(selector: string, value: string) {
    const input = element<HTMLInputElement>(selector);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  it.each(['missing', 'foreign'] as const)('redireciona rascunho %s', async (kind) => {
    if (kind === 'missing') services.checkout.clearDraft();
    else services.checkout.saveDraft({ ...draft, userId: 'outro' });
    await mount();
    expect(container.textContent).toBe('Destino unidades');
  });
  it('PIX cria reserva simulada e limpa rascunho', async () => {
    await mount();
    expect(container.textContent).toContain('nenhum valor será cobrado');
    await submit();
    const bookings = await services.bookings.getAll();
    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({ userId: draft.userId, total: 160, paymentStatus: 'completed' });
    expect(services.checkout.getDraft()).toBeNull();
    expect(element('output').textContent).toContain('Sala Executive');
  });
  it('valida cartão e aplica máscaras antes de confirmar', async () => {
    await mount();
    await click('[role="radio"]:nth-child(2)');
    await submit();
    expect(element('[role="alert"]').textContent).toContain('nome impresso');
    await change('#card-holder', 'Cliente Teste');
    await change('#card-number', '4111111111111111');
    await change('#card-expiry', '1230');
    await change('#card-cvv', '123abc');
    expect(element<HTMLInputElement>('#card-number').value).toBe('4111 1111 1111 1111');
    expect(element<HTMLInputElement>('#card-expiry').value).toBe('12/30');
    expect(element<HTMLInputElement>('#card-cvv').value).toBe('123');
    await submit();
    expect(await services.bookings.getAll()).toHaveLength(1);
    expect(JSON.stringify(await services.bookings.getAll())).not.toContain('4111');
  });
  it('bloqueia conflito descoberto na confirmação', async () => {
    await services.bookings.create({ ...draft, status: 'upcoming', adminStatus: 'confirmed' });
    const create = vi.spyOn(services.bookings, 'create');
    await mount();
    await submit();
    expect(element('[role="alert"]').textContent).toContain('indisponível');
    expect(element<HTMLButtonElement>('.payment-submit').disabled).toBe(true);
    expect(create).not.toHaveBeenCalled();
    expect(services.checkout.getDraft()).toBeNull();
  });
  it('mantém rascunho e permite tentar novamente se persistência falhar', async () => {
    vi.spyOn(services.bookings, 'create').mockRejectedValueOnce(new Error('Falha'));
    await mount();
    await submit();
    expect(element('[role="alert"]').textContent).toContain('pagamento simulado');
    expect(services.checkout.getDraft()).not.toBeNull();
    expect(element<HTMLButtonElement>('.payment-submit').disabled).toBe(false);
  });
  it('preserva consumo parcial do plano', async () => {
    await services.users.updateUserHoursPlan(draft.userId, {
      hasHoursPlan: true, hoursBalance: 1, hoursPlanTotal: 10, hoursPlanRenewsOn: '2026-10-20',
    });
    services.checkout.saveDraft({ ...draft, total: 80, hoursFromPlan: 1, hoursToPay: 1 });
    await mount();
    expect(container.textContent).toContain('1h cobertas · 1h a pagar');
    await submit();
    expect((await services.bookings.getAll())[0]).toMatchObject({ total: 80, hoursFromPlan: 1 });
    expect((await services.auth.getUserById(draft.userId))?.hoursBalance).toBe(0);
  });
});
