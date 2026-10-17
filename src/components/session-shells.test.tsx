import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import { AdminShell } from './AdminShell';
const mocks = vi.hoisted(() => ({ logout: vi.fn<() => Promise<void>>(), attention: vi.fn<(_enabled?: boolean) => number>(() => 0) }));
vi.mock('../state/AuthContext', () => ({ useAuth: () => ({ user: { id: 'uuid', name: 'Equipe', role: 'admin' }, logout: mocks.logout }) }));
vi.mock('./ThemeToggle', () => ({ ThemeToggle: () => <button>tema</button> }));
vi.mock('../hooks/useAdminTasks', () => ({ useTaskAttentionCount: mocks.attention }));
describe('shells com autenticação real', () => {
  let root: Root; let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); mocks.logout.mockReset(); mocks.attention.mockClear();
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
  async function render(admin: boolean, blocked: boolean) {
    await act(async () => root.render(<MemoryRouter><Routes>
      <Route element={admin ? <AdminShell blocked={blocked} /> : <AppShell blocked={blocked} />}><Route path="/" element={<p>conteúdo privado</p>} /></Route>
      <Route path="/login" element={<p>login confirmado</p>} />
    </Routes></MemoryRouter>));
  }
  it.each([false, true])('mostra falha de logout sem redirecionar e permite tentar novamente (admin=%s)', async admin => {
    mocks.logout.mockRejectedValueOnce(new Error('SQL privado')).mockResolvedValue();
    await render(admin, true);
    await act(async () => container.querySelector<HTMLButtonElement>('.app-logout, .admin-account__logout')?.click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível encerrar a sessão.');
    expect(container.textContent).not.toContain('SQL privado');
    expect(container.textContent).not.toContain('login confirmado');
    await act(async () => container.querySelector<HTMLButtonElement>('.app-logout, .admin-account__logout')?.click());
    expect(container.textContent).toContain('login confirmado');
  });
  it.each([false, true])('não monta Outlet privado quando módulo está bloqueado (admin=%s)', async admin => {
    await render(admin, true);
    expect(container.textContent).toContain('Funcionalidade em preparação');
    expect(container.textContent).not.toContain('conteúdo privado');
    if (admin) expect(mocks.attention).toHaveBeenCalledWith(false);
  });
});
