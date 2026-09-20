import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { services } from '../services';
import { ThemeProvider } from '../state/ThemeContext';
import { RecoverPasswordPage } from './RecoverPasswordPage';

describe('RecoverPasswordPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.setItem('c2w_theme', 'dark');
    vi.spyOn(services.auth, 'resetPassword').mockResolvedValue(undefined);
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
    await act(async () => root.render(<MemoryRouter><ThemeProvider><RecoverPasswordPage /></ThemeProvider></MemoryRouter>));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  async function change(value: string) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(element('input'), value);
      element('input').dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  async function submit() {
    await act(async () => element('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  }
  it('valida e-mail obrigatório e inválido antes de enviar', async () => {
    await mount();
    await submit();
    expect(element('[role="alert"]').textContent).toBe('Informe seu e-mail.');
    await change('invalido');
    await submit();
    expect(element('[role="alert"]').textContent).toBe('Digite um e-mail válido.');
    expect(services.auth.resetPassword).not.toHaveBeenCalled();
  });
  it.each(['cliente@example.com', 'desconhecido@example.com'])('mantém confirmação para %s', async (email) => {
    await mount();
    await change(email);
    await submit();
    expect(services.auth.resetPassword).toHaveBeenCalledWith(email);
    expect(container.querySelector('form')).toBeNull();
    expect(element('h1').textContent).toBe('Verifique seu e-mail');
    expect(element('[role="status"] strong').textContent).toBe(email);
    expect(element('a').getAttribute('href')).toBe('/login');
  });
  it('mantém loading, mensagem genérica de falha e nova tentativa', async () => {
    let reject: (error: Error) => void = () => { throw new Error('Promise não iniciada'); };
    vi.mocked(services.auth.resetPassword).mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
    await mount();
    await change('cliente@example.com');
    await submit();
    expect(element<HTMLButtonElement>('[type="submit"]').disabled).toBe(true);
    await act(async () => reject(new Error('Detalhe privado')));
    expect(element('[role="alert"]').textContent).toBe('Não foi possível enviar o link. Tente novamente.');
    expect(container.textContent).not.toContain('Detalhe privado');
    expect(element<HTMLButtonElement>('[type="submit"]').disabled).toBe(false);
    await submit();
    expect(element('h1').textContent).toBe('Verifique seu e-mail');
  });
});
