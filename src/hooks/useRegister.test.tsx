import { passwordError } from '../utils/validators';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from '../pages/RegisterPage';
import type { RegisterInput } from '../types/domain';
const { register } = vi.hoisted(() => ({ register: vi.fn<(input: RegisterInput) => Promise<unknown>>() }));
vi.mock('../services', () => ({ services: { auth: { register } } }));
vi.mock('../components/PublicAuthLayout', () => ({ PublicAuthLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
function Probe() { const location = useLocation(); return <output>{location.pathname}</output>; }
describe('cadastro View e ViewModel', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    register.mockReset();
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => root.render(<MemoryRouter initialEntries={['/cadastro']}><Routes><Route path="/cadastro" element={<RegisterPage />} /><Route path="/login" element={<Probe />} /></Routes></MemoryRouter>));
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
  async function fill(password = 'abc123') {
    const values = { name: 'Maria Silva', email: 'maria@example.com', profession: 'Designer', phone: '11987654321', password, confirmPassword: password };
    for (const [name, value] of Object.entries(values)) {
      const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (!input) throw new Error('Campo ausente');
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  }
  async function submit() { await act(async () => container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
  it('mantem limite nos dois campos e envia somente dados do contrato ao gateway', async () => {
    expect(container.querySelector<HTMLInputElement>('#password')?.maxLength).toBe(128);
    expect(container.querySelector<HTMLInputElement>('#confirmPassword')?.maxLength).toBe(128);
    register.mockResolvedValue({});
    await fill(); await submit();
    expect(register).toHaveBeenCalledOnce();
    expect(register.mock.calls[0]?.[0]).toEqual({ name: 'Maria Silva', email: 'maria@example.com', profession: 'Designer', phone: '(11) 98765-4321', password: 'abc123' });
    expect(container.querySelector('output')?.textContent).toBe('/login');
  });
  it.each(['abc 123', 'abc\t123', '12345', 'a'.repeat(129)])('rejeita senha invalida antes da API (%s)', async password => {
    await fill(password); await submit();
    expect(register).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
  it('validador rejeita quebra de linha recebida fora do input nativo', () => { expect(passwordError('abc\n123')).toBe('A senha não pode conter espaços.'); });
  it('preserva formulario e permite tentar novamente apos falha', async () => {
    register.mockRejectedValueOnce(new Error('Cadastro indisponível no momento. Tente novamente.')).mockResolvedValue({});
    await fill(); await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Cadastro indisponível');
    expect(container.querySelector<HTMLInputElement>('#email')?.value).toBe('maria@example.com');
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
    await submit();
    expect(container.querySelector('output')?.textContent).toBe('/login');
  });
});