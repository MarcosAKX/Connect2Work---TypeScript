import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import type { ManagedUsersPage } from '../../../types/domain';
import { useAdminUsers } from '../useAdminUsers';
const mocks = vi.hoisted(() => ({ list: vi.fn<(query: unknown) => Promise<ManagedUsersPage>>(), update: vi.fn() }));
vi.mock('../../../services', () => ({ services: { users: { listUsersPage: mocks.list, updateUser: mocks.update } } }));
const user = { id: 'u1', name: 'Pessoa Teste', email: 'teste@example.invalid', role: 'client' as const, active: true, createdAt: '2026-10-18T12:00:00Z', hasHoursPlan: false, hoursBalance: 0, version: '2026-10-18 12:00:00.000001' };
const page: ManagedUsersPage = { items: [user], page: 1, pageSize: 50, total: 1, summary: { total: 80, active: 75, inactive: 5, admin: 2, client: 77, secretaria: 1 } };
let model: ReturnType<typeof useAdminUsers>;
function Probe() { model = useAdminUsers(); return null; }
describe('Admin usuários ViewModel', () => {
  let root: Root; let container: HTMLDivElement;
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); mocks.list.mockReset().mockResolvedValue(page); mocks.update.mockReset(); container = document.createElement('div'); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
  const render = async () => { await act(async () => root.render(<Probe />)); };
  it('usa resumo global e lista paginada, não contadores da página', async () => { await render(); expect(mocks.list).toHaveBeenCalledWith({ page: 1, pageSize: 50 }); expect(model.stats.total).toBe(80); expect(model.users).toHaveLength(1); });
  it('busca tem debounce de 250ms e troca de filtro reinicia página', async () => {
    await render(); await act(async () => model.setPage(2)); await act(async () => model.setSearch('Maria')); expect(mocks.list).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(250)); expect(mocks.list).toHaveBeenLastCalledWith({ page: 1, pageSize: 50, search: 'Maria' });
  });
  it('ignora resposta antiga após filtro novo', async () => {
    let resolve: ((value: ManagedUsersPage) => void) | undefined;
    mocks.list.mockImplementationOnce(() => new Promise(done => { resolve = done; })); await render();
    await act(async () => model.setRoleFilter('client')); await act(async () => resolve?.({ ...page, items: [{ ...user, name: 'Antigo' }] }));
    expect(model.users[0]?.name).toBe('Pessoa Teste');
  });
  it('limpar a busca antes do debounce não deixa carregamento permanente', async () => {
    await render(); await act(async () => model.setSearch('Maria')); await act(async () => model.setSearch(''));
    await act(async () => vi.advanceTimersByTimeAsync(300)); expect(model.loading).toBe(false); expect(model.users).toHaveLength(1);
  });
  it('edição usa versão do formulário e conflito não reenvia automaticamente', async () => {
    await render(); mocks.update.mockRejectedValue(new Error('Recarregue a lista.'));
    await act(async () => { expect(await model.updateUser('u1', { name: user.name, email: user.email, role: 'client', active: true }, '2026-10-18 11:00:00.000001')).toBe(false); });
    expect(mocks.update).toHaveBeenCalledTimes(1); expect(mocks.update.mock.calls[0]?.[2]).toBe('2026-10-18 11:00:00.000001'); expect(model.error).toContain('Recarregue');
  });
  it('gravação pendente não restaura filtro antigo ao atualizar a lista', async () => {
    await render(); let resolve: (() => void) | undefined; let mutation: Promise<boolean> | undefined;
    mocks.update.mockImplementationOnce(() => new Promise<void>(done => { resolve = done; }));
    await act(async () => { mutation = model.updateUser('u1', { name: user.name, email: user.email, role: 'client', active: true }, user.version); });
    await act(async () => model.setRoleFilter('admin'));
    await act(async () => { resolve?.(); await mutation; });
    expect(mocks.list).toHaveBeenLastCalledWith({ page: 1, pageSize: 50, role: 'admin' });
  });
});
