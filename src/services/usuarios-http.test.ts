import { describe, it, expect, vi } from 'vitest';
import { UsuariosHttpGateway } from './usuarios-http';
const user = { id: 'u1', name: 'Pessoa Teste', email: 'teste@example.invalid', profession: '', phone: '', active: true, role: 'client', createdAt: '2026-10-18T12:00:00.000Z', version: '2026-10-18 12:00:00.000001', hasHoursPlan: false, hoursBalance: 0 };
const summary = { total: 1, active: 1, inactive: 0, client: 1, admin: 0, secretaria: 0 };
const page = { items: [user], page: 1, pageSize: 50, total: 1, summary };
describe('Usuários HTTP', () => {
  it('usa paginação e cookies, seleciona dados públicos sem repassar credenciais', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...page, items: [{ ...user, senha_hash: 'privado', password: 'privada' }] })));
    const result = await new UsuariosHttpGateway(fetcher).listUsersPage({ page: 1, pageSize: 50, search: 'Pessoa & Nome' });
    expect(result.items).toEqual([user]); expect(fetcher).toHaveBeenCalledWith('/api/admin/usuarios?page=1&pageSize=50&search=Pessoa+%26+Nome', expect.objectContaining({ credentials: 'include', cache: 'no-store' }));
  });
  it('não aceita página, versão ou resumo inconsistentes', async () => {
    for (const bad of [{ ...page, items: [{ ...user, version: '' }] }, { ...page, items: [{ ...user, role: 'root' }] }, { ...page, total: -1 }, { ...page, summary: { ...summary, total: 2 } }, { ...page, items: [{ ...user, createdAt: 'não é data' }] }]) {
      await expect(new UsuariosHttpGateway(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(bad)))).listUsersPage({ page: 1, pageSize: 50 })).rejects.toThrow();
    }
  });
  it('envia versão e whitelist; não repete escrita nem devolve erro SQL', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify(user))).mockResolvedValueOnce(new Response('SQL privado', { status: 409 }));
    const gateway = new UsuariosHttpGateway(fetcher);
    await gateway.updateUser('u1', { name: user.name, email: user.email, role: 'client', active: true, password: undefined }, user.version);
    const request = fetcher.mock.calls[0]?.[1]; expect(request?.headers).toEqual(expect.objectContaining({ 'X-C2W-Request': '1' }));
    expect(JSON.parse(String(request?.body))).toEqual({ name: user.name, email: user.email, role: 'client', active: true, expectedVersion: user.version });
    await expect(gateway.updateUserStatus('u1', false, user.version)).rejects.toThrow('Recarregue'); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('401 revalida sessão; 403 mantém erro de permissão', async () => {
    const revalidate = vi.fn(); const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(new Response(null, { status: 403 }));
    const gateway = new UsuariosHttpGateway(fetcher, revalidate);
    await expect(gateway.listUsersPage({ page: 1, pageSize: 50 })).rejects.toThrow('Sessão encerrada'); expect(revalidate).toHaveBeenCalledOnce();
    await expect(gateway.listUsersPage({ page: 1, pageSize: 50 })).rejects.toThrow('permissão'); expect(revalidate).toHaveBeenCalledOnce();
  });
});
