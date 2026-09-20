import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../state/AuthContext';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import type { User } from '../types/domain';
import { AdminHoursPlanPage } from './AdminHoursPlanPage';

describe('AdminHoursPlanPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: User;
  const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 16, 12));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true, value(this: HTMLDialogElement) { this.open = true; },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true, value(this: HTMLDialogElement) { this.open = false; },
    });
    localStorage.clear();
    sessionStorage.clear();
    createLocalStorageServices();
    client = await services.auth.login('teste@connect2work.com', '123456');
    await services.auth.login('admin@connect2work.com', 'admin123');
    await services.users.updateUserHoursPlan(client.id, { hasHoursPlan: false, hoursBalance: 0 });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    if (showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (close) Object.defineProperty(HTMLDialogElement.prototype, 'close', close);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  async function mount() {
    await act(async () => root.render(
      <MemoryRouter><AuthProvider><AdminHoursPlanPage /></AuthProvider></MemoryRouter>,
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
  async function change(selector: string, value: string) {
    const input = element<HTMLInputElement | HTMLSelectElement>(selector);
    const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
  }
  async function findClient() { await change('.hours-plan-filters input', client.email); }
  async function openEditor() { await findClient(); await click('.hours-plan-actions button'); }
  async function save() { await click('dialog .btn-primary'); }
  async function stored() { return (await services.users.listUsersWithHoursPlanInfo()).find(user => user.id === client.id); }
  async function configure(renewal = '2026-09-01') {
    await services.users.updateUserHoursPlan(client.id, {
      hasHoursPlan: true, hoursPlanTotal: 50, hoursBalance: 12, hoursPlanRenewsOn: renewal,
    });
  }

  it('filtra usuários sem reduzir métricas gerais', async () => {
    await configure();
    await mount();
    const metrics = element('.hours-plan-stats').textContent;
    await change('.hours-plan-filters select', 'expired');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    await change('.hours-plan-filters input', 'inexistente');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(element('.hours-plan-stats').textContent).toBe(metrics);
    await change('.hours-plan-filters input', '');
    await change('.hours-plan-filters select', 'without');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    await change('.hours-plan-filters select', 'with');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    await change('.hours-plan-filters select', 'current');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
  });
  it('valida campos, ativa plano e encerra aviso após cinco segundos', async () => {
    await mount();
    await openEditor();
    await click('dialog input[type="checkbox"]');
    await save();
    expect(element('[role="alert"]').textContent).toBe('Informe o total contratado.');
    await change('dialog input[type="number"]', '40');
    await change('dialog label:nth-child(2) input[type="number"]', '-1');
    await save();
    expect(element('[role="alert"]').textContent).toBe('O saldo não pode ser negativo.');
    await change('dialog label:nth-child(2) input[type="number"]', '20');
    await save();
    expect(element('[role="alert"]').textContent).toBe('Informe a data de renovação.');
    await change('dialog input[type="date"]', '2026-10-16');
    await save();
    expect(await stored()).toMatchObject({ hasHoursPlan: true, hoursPlanTotal: 40, hoursBalance: 20, hoursPlanRenewsOn: '2026-10-16' });
    expect(container.querySelector('dialog')).toBeNull();
    expect(element('[role="status"]').textContent).toContain('Plano de horas salvo.');
    await act(async () => vi.advanceTimersByTime(5000));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
  it('permite ajuste acima do pacote com aviso e desativação', async () => {
    await configure('2026-10-16');
    await mount();
    await openEditor();
    await change('dialog label:nth-child(2) input[type="number"]', '60');
    expect(element('.hours-plan-warning').textContent).toContain('Você ainda pode salvar');
    await save();
    expect((await stored())?.hoursBalance).toBe(60);
    await click('.hours-plan-actions button');
    await click('dialog input[type="checkbox"]');
    await save();
    expect(await stored()).toMatchObject({ hasHoursPlan: false, hoursBalance: 0 });
    expect((await stored())?.hoursPlanTotal).toBeUndefined();
  });
  it.each(['admin', 'secretaria'] as const)('renova como %s somente após confirmação', async (role) => {
    await configure();
    if (role === 'secretaria') await services.auth.login('secretaria@connect2work.com', 'secretaria123');
    await mount();
    expect(Boolean(container.querySelector('.page-back'))).toBe(role === 'admin');
    await findClient();
    await click('.is-renew');
    await click('dialog .btn-secondary');
    expect((await stored())?.hoursBalance).toBe(12);
    await click('.is-renew');
    await save();
    expect(await stored()).toMatchObject({ hoursBalance: 50, hoursPlanRenewsOn: '2026-10-16', hoursPlanPaymentConfirmed: true });
    expect(container.querySelector('.is-renew')).toBeNull();
    expect(container.querySelector('dialog')).toBeNull();
  });
  it('mantém edição aberta quando atualização falha', async () => {
    await configure();
    vi.spyOn(services.users, 'updateUserHoursPlan').mockRejectedValueOnce(new Error('Falha ao salvar'));
    await mount();
    await openEditor();
    await change('dialog label:nth-child(2) input[type="number"]', '25');
    await save();
    expect(element('dialog [role="alert"]').textContent).toBe('Falha ao salvar');
    expect((await stored())?.hoursBalance).toBe(12);
  });
  it('mantém renovação aberta quando serviço falha', async () => {
    await configure();
    vi.spyOn(services.users, 'confirmHoursPlanRenewal').mockRejectedValueOnce(new Error('Falha ao renovar'));
    await mount();
    await findClient();
    await click('.is-renew');
    await save();
    expect(element('dialog [role="alert"]').textContent).toBe('Falha ao renovar');
    expect((await stored())?.hoursBalance).toBe(12);
  });
  it('permite tentar novamente após falha de carregamento', async () => {
    vi.spyOn(services.users, 'listUsersWithHoursPlanInfo').mockRejectedValueOnce(new Error('Falha ao carregar'));
    await mount();
    expect(element('[role="alert"]').textContent).toContain('Falha ao carregar');
    await click('.hours-plan-page-error button');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
