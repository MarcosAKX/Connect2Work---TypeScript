import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import type { AuthSession } from '../../services/contracts';
import { AuthProvider, useAuth } from '../AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { AdminRoute } from '../../components/AdminRoute';
const mocks = vi.hoisted(() => ({
  restore: vi.fn<() => Promise<AuthSession | null>>(), activity: vi.fn<() => Promise<AuthSession | null>>(),
  login: vi.fn(), logout: vi.fn<() => Promise<void>>(), clear: vi.fn(),
  subscribe: vi.fn<(listener: () => void) => () => void>()
}));
vi.mock('../../services', () => ({ services: { auth: { mode: 'http', getCurrentUser: () => null, restoreSession: mocks.restore, recordActivity: mocks.activity, login: mocks.login,
  loginWithGoogle: vi.fn(), logout: mocks.logout, onSessionExpired: mocks.subscribe }, checkout: { clearDraft: mocks.clear } } }));
vi.mock('../../components/AppShell', () => ({ AppShell: ({ blocked }: { blocked?: boolean }) => <p>{blocked ? 'módulo pendente' : 'conteúdo privado'}</p> }));
vi.mock('../../components/AdminShell', () => ({ AdminShell: ({ blocked }: { blocked?: boolean }) => <p>{blocked ? 'admin pendente' : 'admin privado'}</p> }));
const user = { id: 'uuid', name: 'Maria Silva', email: 'maria@example.com', profession: 'Designer', phone: '11987654321', role: 'client' as const,
  active: true, createdAt: new Date().toISOString(), hasHoursPlan: false, hoursBalance: 0 };
function session(): AuthSession { return { user, idleExpiresAt: new Date(Date.now() + 900000).toISOString(), absoluteExpiresAt: new Date(Date.now() + 14400000).toISOString() }; }
let model: ReturnType<typeof useAuth> | undefined;
function Probe() { model = useAuth(); return <output>{model.status}/{model.user?.id ?? 'sem usuário'}</output>; }
describe('AuthContext e proteção assíncrona', () => {
  let root: Root; let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    mocks.restore.mockReset().mockResolvedValue(null); mocks.activity.mockReset().mockResolvedValue(session());
    mocks.login.mockReset().mockResolvedValue(user); mocks.logout.mockReset().mockResolvedValue();
    mocks.clear.mockReset(); mocks.subscribe.mockReset().mockReturnValue(() => {});
    model = undefined; container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  async function render(path = '/unidades') {
    await act(async () => root.render(<MemoryRouter initialEntries={[path]}><AuthProvider><Probe /><Routes>
      <Route element={<ProtectedRoute />}><Route path="/unidades" element={<p>página</p>} /><Route path="/meus-agendamentos" element={<p>reservas</p>} /></Route>
      <Route element={<AdminRoute allowedRoles={['admin']} />}><Route path="/admin" element={<p>admin</p>} /></Route>
      <Route path="/login" element={<p>login</p>} />
    </Routes></AuthProvider></MemoryRouter>));
  }
  it('retorno à aba preserva a página e bloqueia interação até verificar a sessão', async () => {
    mocks.restore.mockResolvedValue(session());
    await render();
    const page = Array.from(container.querySelectorAll('p')).find(element => element.textContent === 'conteúdo privado');
    let finish: ((value: AuthSession) => void) | undefined;
    mocks.restore.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(model?.status).toBe('authenticated');
    expect(page?.isConnected).toBe(true);
    expect(container.querySelector('[inert]')).not.toBeNull();
    await act(async () => finish?.(session()));
    expect(page?.isConnected).toBe(true);
    expect(container.querySelector('[inert]')).toBeNull();
  });
  it.each(['inatividade', 'absoluto'])('prazo %s vencido retorna ao login mesmo com API indisponível', async limit => {
    vi.useFakeTimers();
    const current = session();
    if (limit === 'absoluto') current.absoluteExpiresAt = new Date(Date.now() + 1000).toISOString();
    mocks.restore.mockResolvedValueOnce(current).mockRejectedValue(new Error('offline'));
    await render();
    await act(async () => vi.advanceTimersByTimeAsync(limit === 'absoluto' ? 1000 : 900000));
    expect(model?.status).toBe('anonymous'); expect(container.textContent).toContain('login');
    expect(container.textContent).not.toContain('Tentar novamente');
    expect(mocks.restore).toHaveBeenCalledOnce();
  });
  it('verificação pendente não impede expiração nem deixa o login inerte', async () => {
    vi.useFakeTimers();
    mocks.restore.mockResolvedValueOnce(session());
    await render();
    let finish: ((value: AuthSession) => void) | undefined;
    mocks.restore.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(container.querySelector('[inert]')).not.toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(900000));
    expect(model?.status).toBe('anonymous'); expect(container.querySelector('[inert]')).toBeNull();
    await act(async () => finish?.(session()));
    expect(model?.status).toBe('anonymous');
  });
  it('falha antes do prazo permite tentar novamente, mas prazo vencido volta ao login', async () => {
    vi.useFakeTimers();
    mocks.restore.mockResolvedValueOnce(session()).mockRejectedValue(new Error('offline'));
    await render();
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(container.textContent).toContain('Tentar novamente');
    await act(async () => vi.advanceTimersByTimeAsync(900000));
    expect(container.textContent).toContain('login'); expect(container.textContent).not.toContain('Tentar novamente');
  });
  it('novo prazo confirmado substitui o anterior', async () => {
    vi.useFakeTimers();
    const first = session(); mocks.restore.mockResolvedValueOnce(first);
    await render();
    await act(async () => vi.advanceTimersByTimeAsync(14 * 60000));
    mocks.restore.mockResolvedValueOnce({ ...first, idleExpiresAt: new Date(Date.now() + 900000).toISOString() });
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(model?.status).toBe('authenticated');
    await act(async () => vi.advanceTimersByTimeAsync(14 * 60000));
    expect(model?.status).toBe('anonymous'); expect(mocks.restore).toHaveBeenCalledTimes(2);
  });
  it('aguarda restauração sem redirecionar nem expor conteúdo privado', async () => {
    let finish: ((value: AuthSession) => void) | undefined;
    mocks.restore.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await render(); expect(container.textContent).toContain('checking'); expect(container.textContent).not.toContain('login');
    expect(container.textContent).not.toContain('conteúdo privado');
    await act(async () => finish?.(session()));
    expect(container.textContent).toContain('authenticated/uuid'); expect(container.textContent).toContain('conteúdo privado');
  });
  it('rede indisponível bloqueia rota, não mostra detalhes e permite nova tentativa', async () => {
    mocks.restore.mockRejectedValueOnce(new Error('SQL privado')).mockResolvedValue(session());
    await render(); expect(container.textContent).toContain('error'); expect(container.textContent).not.toContain('SQL privado');
    expect(container.textContent).not.toContain('conteúdo privado');
    await act(async () => container.querySelector('button')?.click());
    expect(container.textContent).toContain('authenticated/uuid');
  });
  it('resposta antiga de restauração não reabre sessão depois do logout', async () => {
    let finish: ((value: AuthSession) => void) | undefined;
    mocks.restore.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await render();
    await act(async () => model?.logout());
    await act(async () => finish?.(session()));
    expect(model?.status).toBe('anonymous'); expect(model?.user).toBeNull(); expect(mocks.clear).toHaveBeenCalled();
  });
  it('login confirma sessão na API, logout falho mantém usuário e logout confirmado limpa', async () => {
    await render();
    mocks.restore.mockResolvedValue(session());
    await act(async () => model?.login(user.email, 'abc123'));
    expect(model?.status).toBe('authenticated');
    mocks.logout.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { await expect(model?.logout()).rejects.toThrow('Não foi possível encerrar a sessão.'); });
    expect(model?.user?.id).toBe(user.id);
    await act(async () => model?.logout());
    expect(model?.user).toBeNull();
  });
  it('401 recebido pelo gateway limpa sessão e rascunho imediatamente', async () => {
    mocks.restore.mockResolvedValue(session());
    await render();
    const notify = mocks.subscribe.mock.calls[0]?.[0]; expect(notify).toBeDefined();
    await act(async () => notify?.());
    expect(model?.status).toBe('anonymous'); expect(mocks.clear).toHaveBeenCalled();
  });
  it('modo real bloqueia módulos pendentes mantendo proteção por perfil', async () => {
    mocks.restore.mockResolvedValue(session());
    await render('/meus-agendamentos'); expect(container.textContent).toContain('módulo pendente');
  });
  it('admin real não abre página administrativa mock', async () => {
    mocks.restore.mockResolvedValue({ ...session(), user: { ...user, role: 'admin' } });
    await render('/admin'); expect(container.textContent).toContain('admin pendente');
  });
});
