import { describe, it, expect, vi } from 'vitest';
import { SalasHttpGateway } from '../salas-http';
const room = { id: 'room1', unitId: 'unit1', name: 'Sala', capacity: 4, pricePerHour: 50, amenities: ['Wi-Fi'], imageUrl: null };
describe('Salas HTTP', () => {
  it('filtra unidade na URL, usa cookie e seleciona DTO público', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify([{ ...room, interno: 'privado' }])));
    expect(await new SalasHttpGateway(fetcher).getRoomsByUnitId('unit1')).toEqual([room]);
    expect(fetcher).toHaveBeenCalledWith('/api/unidades/unit1/salas', expect.objectContaining({ credentials: 'include', cache: 'no-store' }));
  });
  it('não mistura salas de outra unidade nem aceita contrato inválido', async () => {
    for (const value of [{ ...room, unitId: 'outra' }, { ...room, capacity: 0 }, { ...room, pricePerHour: -1 }, { ...room, amenities: [123] }, { ...room, imageUrl: 'javascript:alert(1)' }]) {
      const gateway = new SalasHttpGateway(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify([value]))));
      await expect(gateway.getRoomsByUnitId('unit1')).rejects.toThrow('Não foi possível carregar as salas.');
    }
  });
  it('diferencia detalhe ausente, sessão encerrada e falha de rede sem expor detalhes', async () => {
    const expired = vi.fn();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 404 })).mockResolvedValueOnce(new Response(null, { status: 401 })).mockRejectedValueOnce(new Error('SQL privado'));
    const gateway = new SalasHttpGateway(fetcher, expired);
    expect(await gateway.getRoomById('ausente')).toBeNull();
    await expect(gateway.getRoomsByUnitId('unit1')).rejects.toThrow('Sessão encerrada'); expect(expired).toHaveBeenCalledOnce();
    await expect(gateway.getRoomsByUnitId('unit1')).rejects.toThrow('Não foi possível carregar as salas.');
  });
  it('valida que o detalhe recebido pertence ao identificador solicitado', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify(room)));
    const gateway = new SalasHttpGateway(fetcher);
    expect(await gateway.getRoomById(room.id)).toEqual(room);
    await expect(gateway.getRoomById('outra')).rejects.toThrow('Não foi possível carregar as salas.');
  });
});
