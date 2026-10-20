import { describe, it, expect, vi } from 'vitest';
import { UnidadesHttpGateway } from '../unidades-http';
const unit = { id: 'u1', name: 'Unidade Centro', address: 'Rua Central', availableRooms: 2, imageUrl: null, latitude: -20.9, longitude: -48.4 };
describe('unidades HTTP', () => {
  it('consulta com cookie e retorna somente o contrato público', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify([{ ...unit, segredo: 'interno' }])));
    const gateway = new UnidadesHttpGateway(fetcher);
    expect(await gateway.getUnits()).toEqual([unit]);
    expect(fetcher).toHaveBeenCalledWith('/api/unidades', expect.objectContaining({ credentials: 'include', cache: 'no-store' }));
    expect(await gateway.getUnitById('ausente')).toBeNull();
  });
  it('rejeita dados inválidos e erros internos sem fallback demonstrativo', async () => {
    for (const body of [{}, [{ ...unit, latitude: 100 }], [{ ...unit, availableRooms: -1 }], [{ ...unit, imageUrl: 'javascript:alert(1)' }]]) {
      const gateway = new UnidadesHttpGateway(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body))));
      await expect(gateway.getUnits()).rejects.toThrow('Não foi possível carregar as unidades.');
    }
    const gateway = new UnidadesHttpGateway(vi.fn<typeof fetch>().mockRejectedValue(new Error('SQL privado')));
    await expect(gateway.getUnits()).rejects.toThrow('Não foi possível carregar as unidades.');
  });
  it('avisa expiração em 401 sem expor corpo da resposta', async () => {
    const expired = vi.fn();
    const gateway = new UnidadesHttpGateway(vi.fn<typeof fetch>().mockResolvedValue(new Response('interno', { status: 401 })), expired);
    await expect(gateway.getUnits()).rejects.toThrow('Sessão encerrada.');
    expect(expired).toHaveBeenCalledOnce();
  });
});
