import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { ServicoCatalogoAdministrativo } from '../src/services/servico-catalogo-administrativo';
import { AcessoAdministrativo } from '../src/security/acesso-administrativo';
import { TokenSessao } from '../src/security/token-sessao';
import type { OperacaoCatalogo, RepositorioCatalogoAdministrativo } from '../src/repositories/contracts/repositorio-catalogo-administrativo';
test('catálogo administrativo valida valores e não aceita ator, preço inválido ou URL como imagem', async () => {
  const operations: OperacaoCatalogo[] = []; const token = new TokenSessao().gerar().token;
  const repo: RepositorioCatalogoAdministrativo = { async listarUnidades(q) { return { items: [], total: 0, page: q.page, pageSize: q.pageSize }; }, async listarSalas(q) { return { items: [], total: 0, page: q.page, pageSize: q.pageSize }; }, async listarServicos() { return []; }, async opcoes() { return []; }, async gravar(_actor, op) { operations.push(op); return null; } };
  let role: 'admin' | 'client' = 'admin';
  const access = new AcessoAdministrativo({ async consultar() { return { user: { id: randomUUID(), name: 'Admin Teste', email: 'a@example.invalid', role, profession: '', phone: '', active: true, createdAt: new Date().toISOString(), hasHoursPlan: false, hoursBalance: 0 }, idleExpiresAt: '', absoluteExpiresAt: '' }; } });
  const service = new ServicoCatalogoAdministrativo(repo, access, { async prepararVinculo() {} });
  const base = { requestId: randomUUID(), unitId: randomUUID(), name: 'Sala', capacity: 4, pricePerHour: 50, amenities: ['Wi-Fi'], imageIds: [] };
  for (const extra of [{ capacity: 0 }, { pricePerHour: -1 }, { pricePerHour: 10.999 }, { actorUserId: 'x' }, { imageIds: ['https://evil.invalid/foto'] }]) await assert.rejects(service.criarSala(token, { ...base, ...extra }), { status: 400 });
  await assert.rejects(service.criarUnidade(token, { requestId: randomUUID(), name: 'Unidade', address: 'Rua', latitude: 10 }), { status: 400 });
  await service.criarSala(token, base); assert.equal(operations.length, 1);
  role = 'client'; await assert.rejects(service.criarSala(token, base), { status: 403 });
});
