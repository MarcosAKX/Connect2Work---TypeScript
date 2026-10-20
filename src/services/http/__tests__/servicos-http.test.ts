import { expect, it, vi } from 'vitest';
import { CatalogoAdminHttpGateway } from '../catalogo-admin-http';

const item = { id: '12345678-1234-4234-8234-123456789012', kind: 'fiscal_address' as const, name: 'Fiscal', description: 'Descrição', primaryFeatures: ['Primeiro'], secondaryFeatures: [], active: true, sortOrder: 0, imageUrl: null, imageId: null, version: '2026-10-20 12:00:00.000001' };
it('serviços usam leitura real e escritas enviam somente referência da imagem e versão', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify([item]))).mockResolvedValueOnce(new Response(JSON.stringify(item)));
  const gateway = new CatalogoAdminHttpGateway(fetcher);
  expect(await gateway.listServices()).toHaveLength(1);
  expect(fetcher.mock.calls[0]?.[0]).toBe('/api/servicos');
  await gateway.updateService(item.id, { ...item, imageUrl: 'data:image/png;segredo' }, item.version);
  const body = JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body));
  expect(body.expectedVersion).toBe(item.version);
  expect(body.imageId).toBeNull();
  expect(body).not.toHaveProperty('imageUrl');
});
it('serviços recusam tipos desconhecidos na resposta', async () => {
  const gateway = new CatalogoAdminHttpGateway(async () => new Response(JSON.stringify([{ ...item, kind: 'outro' }])));
  await expect(gateway.listServices()).rejects.toThrow();
});
