import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../state/AuthContext';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import type { User } from '../types/domain';
import { AdminUsersPage } from './AdminUsersPage';

function SessionName() {
  const { user } = useAuth();
  return <output data-testid="session-name">{user?.name}</output>;
}

describe('AdminUsersPage — gestão de contas', () => {
  let container: HTMLDivElement;
  let root: Root;
  let currentAdmin: User;
  let client: User;
  const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 9, 12));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) { this.open = true; },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) { this.open = false; },
    });
    localStorage.clear();
    sessionStorage.clear();
    createLocalStorageServices();
    client = await services.auth.login('teste@connect2work.com', '123456');
    currentAdmin = await services.auth.login('admin@connect2work.com', 'admin123');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function mount() {
    await act(async () => root.render(
      <MemoryRouter><AuthProvider><AdminUsersPage /><SessionName /></AuthProvider></MemoryRouter>,
    ));
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
    const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
  }
  async function save() { await click('.admin-users-modal--form .btn-primary'); }
  async function fill(name: string, email: string, password: string) {
    await change('input[autocomplete="name"]', name);
    await change('input[autocomplete="email"]', email);
    await change('input[type="password"]', password);
  }
  async function saved(id: string) { return (await services.users.listUsers()).find((user) => user.id === id); }
  function rows() { return container.querySelectorAll('tbody tr'); }

  it('filtra busca, papel e status sem reduzir os totais gerais', async () => {
    await mount();
    expect(rows()).toHaveLength(3);
    await change('.admin-users-search input', 'TESTE@');
    expect(rows()).toHaveLength(1);
    expect(element('.admin-users-stat:first-child strong').textContent).toBe('3');
    await change('.admin-users-filters label:nth-child(2) select', 'admin');
    expect(rows()).toHaveLength(0);
    await click('.admin-users-empty button');
    expect(rows()).toHaveLength(3);
    await change('.admin-users-filters label:nth-child(3) select', 'inactive');
    expect(rows()).toHaveLength(0);
    await click('.admin-users-empty button');
    await change('.admin-users-filters label:nth-child(2) select', 'secretaria');
    expect(rows()).toHaveLength(1);
    expect(container.querySelector('tbody')?.textContent).toContain('secretaria@connect2work.com');
  });

  it('valida cadastro e persiste dados pessoais, papel e senha', async () => {
    await mount();
    await click('.admin-users-create');
    await save();
    expect(container.querySelector('.admin-users-form__error')?.textContent).toContain('nome válido');
    await fill('Nova Pessoa', 'invalido', '123');
    await save();
    expect(container.querySelector('.admin-users-form__error')?.textContent).toContain('e-mail válido');
    await change('input[autocomplete="email"]', 'nova@example.com');
    await save();
    expect(container.querySelector('.admin-users-form__error')?.textContent).toContain('6 caracteres');
    expect(await services.users.listUsers()).toHaveLength(3);
    await change('input[type="password"]', 'senha123');
    await change('input[maxlength="80"]', 'Arquiteta');
    await change('input[autocomplete="tel"]', '17999999999');
    await change('.admin-users-modal--form select:first-of-type', 'secretaria');
    await save();
    const created = (await services.users.listUsers()).find((user) => user.email === 'nova@example.com');
    expect(created).toMatchObject({ name: 'Nova Pessoa', profession: 'Arquiteta', phone: '17999999999', role: 'secretaria', active: true });
    expect(container.querySelector('.admin-users-modal--form')).toBeNull();
    expect(rows()).toHaveLength(4);
    expect(await services.auth.login('nova@example.com', 'senha123')).toMatchObject({ id: created?.id });
  });

  it('mantém formulário e erro para e-mail duplicado', async () => {
    await mount();
    await click('.admin-users-create');
    await fill('Duplicado', client.email, 'senha123');
    await save();
    expect(element<HTMLDialogElement>('.admin-users-modal--form').open).toBe(true);
    expect(container.querySelector('.admin-users-form__error')?.textContent).toContain('já está cadastrado');
    expect(await services.users.listUsers()).toHaveLength(3);
  });

  it('edita informações e preserva senha quando o campo fica vazio', async () => {
    await mount();
    await click(`[title="Editar ${client.name}"]`);
    expect(element<HTMLInputElement>('input[type="password"]').value).toBe('');
    await change('input[autocomplete="name"]', 'Cliente Renomeado');
    await change('input[autocomplete="email"]', 'renomeado@example.com');
    await change('input[maxlength="80"]', 'Designer');
    await save();
    expect(await saved(client.id)).toMatchObject({ name: 'Cliente Renomeado', email: 'renomeado@example.com', profession: 'Designer' });
    expect(await services.auth.login('renomeado@example.com', '123456')).toMatchObject({ id: client.id });
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    await act(async () => vi.advanceTimersByTime(4500));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('valida nova senha curta e permite redefinir senha e papel', async () => {
    await mount();
    await click(`[title="Editar ${client.name}"]`);
    await change('input[type="password"]', 'curta');
    await save();
    expect(container.querySelector('.admin-users-form__error')?.textContent).toContain('nova senha');
    await change('input[type="password"]', 'outrasenha');
    await change('.admin-users-modal--form select:first-of-type', 'admin');
    await save();
    expect((await saved(client.id))?.role).toBe('admin');
    await expect(services.auth.login(client.email, '123456')).rejects.toThrow();
    expect(await services.auth.login(client.email, 'outrasenha')).toMatchObject({ id: client.id, role: 'admin' });
  });

  it('bloqueia desativar/rebaixar a própria conta e atualiza a sessão após editar nome', async () => {
    await mount();
    expect(element<HTMLButtonElement>('[title="Sua própria conta administrativa não pode perder permissão nem ser desativada."]').disabled).toBe(true);
    await click(`[title="Editar ${currentAdmin.name}"]`);
    expect([...container.querySelectorAll<HTMLSelectElement>('.admin-users-modal--form select')].every((select) => select.disabled)).toBe(true);
    await change('input[autocomplete="name"]', 'Admin Atualizado');
    await save();
    expect(container.querySelector('[data-testid="session-name"]')?.textContent).toBe('Admin Atualizado');
    expect(await saved(currentAdmin.id)).toMatchObject({ role: 'admin', active: true });
  });

  it('desativação exige confirmação e reativação restaura acesso', async () => {
    await mount();
    await click(`[title="Desativar ${client.name}"]`);
    expect((await saved(client.id))?.active).toBe(true);
    await click('dialog[aria-labelledby="deactivate-user-title"] .btn-secondary');
    expect((await saved(client.id))?.active).toBe(true);
    await click(`[title="Desativar ${client.name}"]`);
    await click('.admin-users-danger');
    expect((await saved(client.id))?.active).toBe(false);
    expect(element<HTMLDialogElement>('dialog[aria-labelledby="deactivate-user-title"]').open).toBe(false);
    await expect(services.auth.login(client.email, '123456')).rejects.toThrow();
    await click(`[title="Ativar ${client.name}"]`);
    expect((await saved(client.id))?.active).toBe(true);
    expect(await services.auth.login(client.email, '123456')).toMatchObject({ id: client.id });
  });

  it('falha de persistência mantém edição aberta e conta inalterada', async () => {
    await mount();
    await click(`[title="Editar ${client.name}"]`);
    await change('input[autocomplete="name"]', 'Não salvar');
    vi.spyOn(services.users, 'updateUser').mockRejectedValueOnce(new Error('Falha de gravação'));
    await save();
    expect(element<HTMLDialogElement>('.admin-users-modal--form').open).toBe(true);
    expect(container.querySelector('.admin-users-form__error')?.textContent).toBe('Falha de gravação');
    expect((await saved(client.id))?.name).toBe(client.name);
  });
});
