import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthHttpGateway } from '../auth-http';
import { createAppServices } from '../../create-app-services';
const user = { id: 'uuid', name: 'Maria Silva', email: 'maria@example.com', profession: 'Designer', phone: '11987654321', role: 'client', active: true, createdAt: '2026-10-11T12:00:00.000Z', hasHoursPlan: false, hoursBalance: 0 };
function session() { return { user, idleExpiresAt: new Date(Date.now() + 900000).toISOString(), absoluteExpiresAt: new Date(Date.now() + 14400000).toISOString() }; }
function response() { return new Response(JSON.stringify(session()), { status: 200 }); }
describe('AuthHttpGateway', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); });
  it('login manda cookies/JSON/header, seleciona campos públicos e não persiste segredo', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...session(), user: { ...user, senhaHash: 'privado', password: 'privado' }, token: 'privado' }), { status: 200 }));
    const gateway = new AuthHttpGateway(fetcher);
    expect(await gateway.login(user.email, 'a'.repeat(130))).toEqual(user);
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('/api/auth/login');
    expect(options).toMatchObject({ method: 'POST', credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-C2W-Request': '1' } });
    expect(JSON.parse(String(options?.body))).toEqual({ email: user.email, password: 'a'.repeat(130) });
    expect(gateway.getCurrentUser()).toEqual(user);
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
  it('restaura sessão por GET e registra atividade somente por POST próprio', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response());
    const gateway = new AuthHttpGateway(fetcher);
    expect((await gateway.restoreSession())?.user).toEqual(user);
    await gateway.recordActivity();
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/auth/session');
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe('GET');
    expect(fetcher.mock.calls[1]?.[0]).toBe('/api/auth/activity');
    expect(fetcher.mock.calls[1]?.[1]?.method).toBe('POST');
  });
  it('401 de sessão limpa memória e sinaliza expiração, login errado só exibe senha incorreta', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response()).mockResolvedValue(new Response('{}', { status: 401 }));
    const gateway = new AuthHttpGateway(fetcher);
    const expired = vi.fn(); const unsubscribe = gateway.onSessionExpired(expired);
    await gateway.restoreSession();
    expect(await gateway.restoreSession()).toBeNull();
    expect(gateway.getCurrentUser()).toBeNull(); expect(expired).toHaveBeenCalledOnce();
    await expect(gateway.login(user.email, 'wrong123')).rejects.toThrow('Senha incorreta');
    expect(expired).toHaveBeenCalledOnce(); unsubscribe();
  });
  it('não aceita usuário inativo, perfil inválido ou prazos inconsistentes', async () => {
    for (const payload of [ { ...session(), user: { ...user, active: false } }, { ...session(), user: { ...user, role: 'root' } }, { ...session(), idleExpiresAt: 'invalid' }, { ...session(), absoluteExpiresAt: new Date(Date.now()).toISOString() } ]) {
      const gateway = new AuthHttpGateway(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 })));
      await expect(gateway.restoreSession()).rejects.toThrow();
      expect(gateway.getCurrentUser()).toBeNull();
    }
  });
  it('falha de rede fica genérica, não simula login Google/reset', async () => {
    const gateway = new AuthHttpGateway(vi.fn<typeof fetch>().mockRejectedValue(new Error('SQL host privado')));
    await expect(gateway.login(user.email, 'abc123')).rejects.toThrow('Não foi possível entrar.');
    await expect(gateway.restoreSession()).rejects.toThrow('Não foi possível verificar a sessão.');
    await expect(gateway.loginWithGoogle()).rejects.toThrow('ainda não está disponível');
    await expect(gateway.resetPassword(user.email)).rejects.toThrow('ainda não está disponível');
  });
  it('logout só limpa memória quando servidor confirma revogação', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response()).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const gateway = new AuthHttpGateway(fetcher);
    await gateway.restoreSession();
    await expect(gateway.logout()).rejects.toThrow('Não foi possível encerrar a sessão.');
    expect(gateway.getCurrentUser()).toEqual(user);
    await gateway.logout(); expect(gateway.getCurrentUser()).toBeNull();
  });
  it('serializa restauração e logout e descarta resposta anterior na memória', async () => {
    let finish: ((value: Response) => void) | undefined;
    const fetcher = vi.fn<typeof fetch>().mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; })).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const gateway = new AuthHttpGateway(fetcher);
    const restoring = gateway.restoreSession();
    await Promise.resolve();
    const leaving = gateway.logout();
    expect(fetcher).toHaveBeenCalledOnce(); expect(finish).toBeDefined();
    finish?.(response()); await restoring; await leaving;
    expect(gateway.getCurrentUser()).toBeNull(); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('modo real não cria contas locais e bloqueia leitura privada/mutações mock', async () => {
    const services = createAppServices(true, vi.fn<typeof fetch>().mockImplementation(async input => String(input) === '/api/unidades'
      ? new Response(JSON.stringify([{ id: 'unidade-real', name: 'Unidade MySQL', address: 'Rua Central', availableRooms: 0, imageUrl: null }]))
      : new Response('{}', { status: 401 })));
    expect(services.auth.mode).toBe('http');
    expect(localStorage.getItem('c2w_mock_users')).toBeNull();
    await expect(services.auth.login('teste@connect2work.com', '123456')).rejects.toThrow('Senha incorreta');
    await expect(services.bookings.getAll()).rejects.toThrow('ainda não integrada');
    await expect(services.users.listUsers()).rejects.toThrow('ainda não integrada');
    await expect(services.tasks.listTasks()).rejects.toThrow('quadro paginado');
    if (!services.tasks.listBoard) throw new Error('Gateway HTTP de tarefas ausente.');
    await expect(services.tasks.listBoard({ page: 1, pageSize: 30, ownership: 'all' })).rejects.toThrow();
    await expect(services.backup.getLastBackupAt('uuid')).rejects.toThrow('ainda não integrada');
    await expect(services.catalog.deleteRoom('room')).rejects.toThrow('ainda não integrada');
    const units = await services.catalog.getUnits();
    expect(units.length).toBeGreaterThan(0);
    units[0]!.name = 'modificado';
    expect((await services.catalog.getUnits())[0]?.name).not.toBe('modificado');
    expect(localStorage.getItem('c2w_mock_users')).toBeNull();
  });
  it('401 tardio de unidades não cancela um novo login em andamento', async () => {
    let finishUnits: ((value: Response) => void) | undefined;
    let finishLogin: ((value: Response) => void) | undefined;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async input => {
      if (String(input) === '/api/unidades') return new Promise(resolve => { finishUnits = resolve; });
      if (String(input) === '/api/auth/login') return new Promise(resolve => { finishLogin = resolve; });
      return response();
    });
    const services = createAppServices(true, fetcher);
    const units = expect(services.catalog.getUnits()).rejects.toThrow('Sessão encerrada');
    const login = services.auth.login(user.email, 'abc123');
    await Promise.resolve();
    finishUnits?.(new Response(null, { status: 401 }));
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    finishLogin?.(response());
    await expect(login).resolves.toEqual(user);
    await units;
    expect(services.auth.getCurrentUser()).toEqual(user);
  });
});
