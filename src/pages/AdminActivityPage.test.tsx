import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../state/AuthContext';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import type { AuditLog, User } from '../types/domain';
import { AdminActivityPage } from './AdminActivityPage';

describe('AdminActivityPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  let admin: User;
  let client: User;
  const logs: AuditLog[] = Array.from({ length: 35 }, (_, index) => ({
    id: 'log-' + index, action: 'update', entity: 'room', entityId: 'room-' + index,
    actorName: index === 0 ? 'Pessoa Única' : 'Equipe', occurredAt: '2026-09-18T12:00:00Z',
  }));
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    createLocalStorageServices();
    client = await services.auth.login('teste@connect2work.com', '123456');
    admin = await services.auth.login('admin@connect2work.com', 'admin123');
    vi.spyOn(services.audit, 'listRecent').mockResolvedValue(logs);
    vi.spyOn(services.audit, 'listHoursPlanTransactions').mockResolvedValue([
      { id: 'tx-1', userId: client.id, type: 'credit', hours: 10, balanceAfter: 10, reason: 'Crédito teste', createdAt: '2026-09-18T12:00:00Z' },
      { id: 'tx-2', userId: client.id, type: 'debit', hours: -2, balanceAfter: 8, reason: 'Consumo teste', createdAt: '2026-09-18T13:00:00Z' },
    ]);
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
  async function mount() {
    await act(async () => root.render(<MemoryRouter><AuthProvider><AdminActivityPage /></AuthProvider></MemoryRouter>));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  async function change(selector: string, value: string) {
    const input = element<HTMLInputElement | HTMLSelectElement>(selector);
    const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
  }
  async function click(selector: string) {
    await act(async () => element<HTMLButtonElement>(selector).click());
  }
  it('lista trinta registros e carrega mais usando ator autenticado', async () => {
    await mount();
    expect(services.audit.listRecent).toHaveBeenCalledWith(admin.id, 500);
    expect(container.querySelectorAll('article')).toHaveLength(30);
    await click('section:first-of-type > button');
    expect(container.querySelectorAll('article')).toHaveLength(35);
    expect(container.querySelector('section:first-of-type > button')).toBeNull();
  });
  it('busca pessoa, entidade e ID, limpa busca e reinicia limite', async () => {
    await mount();
    await click('section:first-of-type > button');
    await change('input[type="search"]', 'PESSOA ÚNICA');
    expect(container.querySelectorAll('article')).toHaveLength(1);
    await change('input[type="search"]', 'room-34');
    expect(container.querySelectorAll('article')).toHaveLength(1);
    await change('input[type="search"]', 'sala');
    expect(container.querySelectorAll('article')).toHaveLength(30);
    await change('input[type="search"]', 'ausente');
    expect(container.textContent).toContain('Nenhuma atividade encontrada');
    await click('.governance-empty button');
    expect(container.querySelectorAll('article')).toHaveLength(30);
  });
  it('filtra clientes e consulta extrato com identificação do ator', async () => {
    await mount();
    expect(container.querySelectorAll('select option')).toHaveLength(2);
    expect(container.textContent).toContain('Escolha um cliente');
    await change('select', client.id);
    expect(services.audit.listHoursPlanTransactions).toHaveBeenCalledWith(client.id, admin.id);
    expect(element('.activity-value.is-positive').textContent).toBe('+10h');
    expect(element('.activity-value.is-negative').textContent).toBe('-2h');
    expect(container.textContent).toContain('Saldo após movimento: 8h');
    await change('select', '');
    expect(container.textContent).toContain('Escolha um cliente');
    expect(container.querySelector('.activity-value')).toBeNull();
  });
  it('exibe extrato vazio', async () => {
    vi.mocked(services.audit.listHoursPlanTransactions).mockResolvedValue([]);
    await mount();
    await change('select', client.id);
    expect(container.textContent).toContain('Este cliente ainda não possui movimentações.');
  });
  it('exibe falha no carregamento inicial', async () => {
    vi.mocked(services.audit.listRecent).mockRejectedValue(new Error('Falha de teste'));
    await mount();
    expect(element('[role="alert"]').textContent).toBe('Falha de teste');
    expect(container.querySelector('.governance-skeleton')).toBeNull();
  });
});
