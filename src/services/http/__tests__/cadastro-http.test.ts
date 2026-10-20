import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CadastroHttpGateway } from '../cadastro-http';
import { createAppServices } from '../../create-app-services';
import type { RegisterInput } from '../../../types/domain';
const input: RegisterInput = { name: 'Maria Silva', email: 'maria@example.com', profession: 'Designer', phone: '11987654321', password: 'abc123' };
const user = { id: 'uuid', name: 'Maria Silva', email: 'maria@example.com', profession: 'Designer', phone: '11987654321', role: 'client', active: true, createdAt: '2026-10-11T12:00:00.000Z', hasHoursPlan: false, hoursBalance: 0 };
describe('cadastro HTTP', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => { vi.unstubAllGlobals(); });
  it('envia somente contrato, recebe usuario seguro e nao persiste credenciais', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...user, password: 'segredo', senha_hash: 'hash' }), { status: 201 }));
    const gateway = new CadastroHttpGateway(fetcher);
    const result = await gateway.register(input);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('/api/auth/register');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({ 'X-C2W-Request': '1' });
    expect(JSON.parse(String(options?.body))).toEqual(input);
    expect(result).toEqual(user);
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('senha_hash');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
  it.each([400, 409, 429, 500, 503])('sanitiza erro HTTP %s', async status => {
    const gateway = new CadastroHttpGateway(vi.fn<typeof fetch>().mockResolvedValue(new Response('{"message":"segredo SQL"}', { status })));
    await expect(gateway.register(input)).rejects.toThrow();
    await gateway.register(input).catch((error: unknown) => expect(String(error)).not.toContain('segredo SQL'));
  });
  it('rejeita resposta invalida e falha de rede sem detalhes privados', async () => {
    for (const response of [new Response('{}', { status: 201 }), new Response('invalid', { status: 201 }), new Response(JSON.stringify({ ...user, role: 'admin' }), { status: 201 })]) {
      await expect(new CadastroHttpGateway(vi.fn<typeof fetch>().mockResolvedValue(response)).register(input)).rejects.toThrow();
    }
    await expect(new CadastroHttpGateway(vi.fn<typeof fetch>().mockRejectedValue(new Error('host privado'))).register(input)).rejects.toThrow('Não foi possível confirmar o cadastro.');
  });
  it('modo real cobre cadastro e login e nao usa fallback local quando API falha', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
    const services = createAppServices(true, fetcher);
    await expect(services.auth.login('teste@connect2work.com', '123456')).rejects.toThrow('Não foi possível entrar.');
    const before = localStorage.getItem('c2w_mock_users');
    await expect(services.auth.register(input)).rejects.toThrow();
    expect(localStorage.getItem('c2w_mock_users')).toBe(before);
  });
});