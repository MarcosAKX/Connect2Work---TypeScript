import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { services } from '../services';
import { ThemeProvider } from '../state/ThemeContext';
import { RegisterPage } from './RegisterPage';

function LoginDestination() {
  const location = useLocation();
  return <output>{JSON.stringify(location.state)}</output>;
}

describe('RegisterPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.setItem('c2w_theme', 'dark');
    vi.spyOn(services.auth, 'register').mockResolvedValue({
      id: 'new', name: 'Ana Silva', email: 'ana@example.com', role: 'client', active: true,
      createdAt: '2026-09-20', hasHoursPlan: false, hoursBalance: 0,
    });
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
      <MemoryRouter initialEntries={['/cadastro']}><ThemeProvider><Routes>
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/login" element={<LoginDestination />} />
      </Routes></ThemeProvider></MemoryRouter>,
    ));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  async function change(field: string, value: string) {
    await act(async () => {
      const input = element<HTMLInputElement>(`#${field}`);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  async function submit() {
    await act(async () => element('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  }
  async function fill() {
    for (const [field, value] of Object.entries({ name: 'Ana Silva', email: 'ana@example.com', profession: 'Designer', phone: '17998765432', password: 'senha123', confirmPassword: 'senha123' })) {
      await change(field, value);
    }
  }
  it('preserva ordem das validações sem chamar gateway', async () => {
    await mount();
    const steps = [
      ['name', 'Ana Silva', 'Informe seu nome e sobrenome.'],
      ['email', 'ana@example.com', 'Informe seu e-mail.'],
      ['profession', 'Designer', 'Informe sua profissão.'],
      ['phone', '17998765432', 'Digite um telefone com DDD. Ex: (11) 98765-4321'],
      ['password', 'senha123', 'A senha deve ter pelo menos 6 caracteres.'],
      ['confirmPassword', 'senha123', 'As senhas não coincidem.'],
    ] as const;
    for (const [field, value, error] of steps) {
      await submit();
      expect(element('[role="alert"]').textContent).toBe(error);
      await change(field, value);
    }
    expect(services.auth.register).not.toHaveBeenCalled();
  });
  it('aplica máscara e envia somente dados do cadastro, retornando ao login', async () => {
    await mount();
    await fill();
    expect(element<HTMLInputElement>('#phone').value).toBe('(17) 99876-5432');
    await submit();
    expect(services.auth.register).toHaveBeenCalledWith({ name: 'Ana Silva', email: 'ana@example.com', profession: 'Designer', phone: '(17) 99876-5432', password: 'senha123' });
    expect(element('output').textContent).toBe('{"registered":true}');
  });
  it('preserva loading, dados e erro do gateway com nova tentativa', async () => {
    let reject: (error: Error) => void = () => { throw new Error('Promise não iniciada'); };
    vi.mocked(services.auth.register).mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
    await mount();
    await fill();
    await submit();
    expect(element<HTMLButtonElement>('[type="submit"]').disabled).toBe(true);
    await act(async () => reject(new Error('E-mail já cadastrado')));
    expect(element('[role="alert"]').textContent).toBe('E-mail já cadastrado');
    expect(element<HTMLInputElement>('#name').value).toBe('Ana Silva');
    expect(element<HTMLButtonElement>('[type="submit"]').disabled).toBe(false);
    await submit();
    expect(element('output').textContent).toBe('{"registered":true}');
  });
  it('mantém controles independentes de senha e links', async () => {
    await mount();
    await act(async () => element<HTMLButtonElement>('[aria-label="Mostrar senha"]').click());
    expect(element<HTMLInputElement>('#password').type).toBe('text');
    expect(element<HTMLInputElement>('#confirmPassword').type).toBe('password');
    await act(async () => element<HTMLButtonElement>('[aria-label="Mostrar confirmação de senha"]').click());
    expect(element<HTMLInputElement>('#confirmPassword').type).toBe('text');
    expect([...container.querySelectorAll('a')].every((link) => link.getAttribute('href') === '/login')).toBe(true);
  });
});
