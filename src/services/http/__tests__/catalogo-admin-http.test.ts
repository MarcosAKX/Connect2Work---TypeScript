import { describe, expect, it, vi } from 'vitest';
import { CatalogoAdminHttpGateway } from '../catalogo-admin-http';
const unit = { id: 'u', name: 'Unidade', address: 'Rua', description: '', availableRooms: 0, imageUrl: null, imageId: null, version: '2026-10-18 12:00:00.000001' };
describe('Catálogo admin HTTP', () => {
  it('distingue limite de resolução sem expor mensagens brutas do servidor', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ code: 'IMAGE_PIXEL_LIMIT', message: 'detalhe interno' }), { status: 400 }));
    await expect(new CatalogoAdminHttpGateway(fetcher).upload(new File(['foto'], 'foto.jpg', { type: 'image/jpeg' }))).rejects.toThrow('40 megapixels');
  });
  it('envia somente campos permitidos, versão, cookies e CSRF; não envia preview', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(unit)));
    const gateway = new CatalogoAdminHttpGateway(fetcher);
    await gateway.updateUnit('u', { name: 'Unidade', address: 'Rua', imageUrl: 'blob:preview', imageId: null }, unit.version);
    const init = fetcher.mock.calls[0]?.[1]; expect(init?.credentials).toBe('include'); expect(init?.headers).toEqual({ 'Content-Type': 'application/json', 'X-C2W-Request': '1' });
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Unidade', address: 'Rua', description: '', latitude: null, longitude: null, imageId: null, expectedVersion: unit.version });
  });
  it('usa FormData sem Content-Type manual e só recebe identificador temporário', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: 'imagem', expiresAt: '2026-10-19T12:00:00Z' })));
    await new CatalogoAdminHttpGateway(fetcher).upload(new File(['imagem'], 'foto.png', { type: 'image/png' }));
    const init = fetcher.mock.calls[0]?.[1]; expect(init?.body).toBeInstanceOf(FormData); expect(init?.headers).toEqual({ 'X-C2W-Request': '1' });
  });
  it('aciona encerramento de sessão e não repete escrita incerta', async () => {
    const expired = vi.fn(); const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('', { status: 401 })).mockRejectedValueOnce(new Error('SQL privado'));
    const gateway = new CatalogoAdminHttpGateway(fetcher, expired);
    await expect(gateway.listUnits({ page: 1, pageSize: 20 })).rejects.toThrow('Sessão encerrada'); expect(expired).toHaveBeenCalledOnce();
    await expect(gateway.createUnit({ name: 'Unidade', address: 'Rua', imageUrl: null, requestId: 'op' })).rejects.toThrow('confirmar'); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejeita resposta de outra página e imagem insegura', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ items: [unit], page: 2, pageSize: 20, total: 1 })));
    await expect(new CatalogoAdminHttpGateway(fetcher).listUnits({ page: 1, pageSize: 20 })).rejects.toThrow();
  });
});
