import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { services } from '../services';
import { AuthProvider } from '../state/AuthContext';
import { ThemeProvider } from '../state/ThemeContext';
import type { User } from '../types/domain';
import { LoginPage } from './LoginPage';

const client: User = {
  id: 'client', name: 'Cliente', email: 'teste@example.com', role: 'client',
  active: true, createdAt: '2026-09-20', hasHoursPlan: false, hoursBalance: 0,
};

describe('LoginPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.setItem('c2w_theme', 'dark');
    vi.spyOn(services.auth, 'getCurrentUser').mockReturnValue(null);
    vi.spyOn(services.auth, 'login').mockResolvedValue(client);
    vi.spyOn(services.auth, 'loginWithGoogle').mockRejectedValue(new Error('Google ainda não integrado'));
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.removeItem('c2w_theme');
    delete document.documentElement.dataset.theme;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  async function mount() {
    await act(async () => root.render(
      <MemoryRouter initialEntries={['/login']}><ThemeProvider><AuthProvider><Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unidades" element={<p>Destino client</p>} />
        <Route path="/admin" element={<p>Destino admin</p>} />
        <Route path="/admin/painel-do-dia" element={<p>Destino secretaria</p>} />
      </Routes></AuthProvider></ThemeProvider></MemoryRouter>,
    ));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  async function change(selector: string, value: string) {
    await act(async () => {
      const input = element<HTMLInputElement>(selector);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  async function submit() {
    await act(async () => element('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  }
  it.each(['client', 'admin', 'secretaria'] as const)('redireciona sessão existente %s', async (role) => {
    vi.mocked(services.auth.getCurrentUser).mockReturnValue({ ...client, role });
    await mount();
    expect(container.textContent).toBe(`Destino ${role}`);
    expect(services.auth.login).not.toHaveBeenCalled();
  });
  it.each(['client', 'admin', 'secretaria'] as const)('login direciona perfil %s', async (role) => {
    vi.mocked(services.auth.login).mockResolvedValue({ ...client, role });
    await mount();
    await change('#email', client.email);
    await change('#password', 'senha-teste');
    await submit();
    expect(services.auth.login).toHaveBeenCalledWith(client.email, 'senha-teste');
    expect(container.textContent).toBe(`Destino ${role}`);
  });
  it('valida campos obrigatórios e preserva links e visibilidade de senha', async () => {
    await mount();
    expect(element('a.forgot-link').getAttribute('href')).toBe('/recuperar-senha');
    expect(element('a.login-register-button').getAttribute('href')).toBe('/cadastro');
    await submit();
    expect(element('[role="alert"]').textContent).toBe('Informe seu e-mail e senha.');
    expect(services.auth.login).not.toHaveBeenCalled();
    await act(async () => element<HTMLButtonElement>('.toggle-visibility').click());
    expect(element<HTMLInputElement>('#password').type).toBe('text');
    expect(element('.toggle-visibility').getAttribute('aria-label')).toBe('Ocultar senha');
  });
  it('mantém loading, mostra falha e permite tentar novamente', async () => {
    let reject: (reason: Error) => void = () => { throw new Error('Promise não iniciada'); };
    vi.mocked(services.auth.login).mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
    await mount();
    await change('#email', client.email);
    await change('#password', 'senha-teste');
    await submit();
    expect(element<HTMLButtonElement>('[type="submit"]').disabled).toBe(true);
    expect(element<HTMLButtonElement>('.login-google-button').disabled).toBe(true);
    await act(async () => reject(new Error('Credenciais inválidas')));
    expect(element('[role="alert"]').textContent).toBe('Credenciais inválidas');
    expect(element<HTMLButtonElement>('[type="submit"]').disabled).toBe(false);
    await submit();
    expect(container.textContent).toBe('Destino client');
  });
  it('preserva falha do Google sem simular integração real', async () => {
    await mount();
    await act(async () => element<HTMLButtonElement>('.login-google-button').click());
    expect(services.auth.loginWithGoogle).toHaveBeenCalledOnce();
    expect(element('[role="alert"]').textContent).toBe('Google ainda não integrado');
    expect(element<HTMLButtonElement>('.login-google-button').disabled).toBe(false);
  });
  it('preserva alternância do tema', async () => {
    await mount();
    await act(async () => element<HTMLButtonElement>('.theme-toggle').click());
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(element('.theme-toggle').getAttribute('aria-label')).toBe('Ativar modo escuro');
  });
});
