import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LimpezaImagens } from '../src/services/limpeza-imagens';
import type { RepositorioArquivosImagens } from '../src/repositories/contracts/repositorio-arquivos-imagens';
test('limpeza usa lease persistido, limita lote e registra falha para retomar sem falso sucesso', async () => {
  let count = 0, failed = 0, removed = 0, concurrent = 0;
  const repo: RepositorioArquivosImagens = { async registrar() { throw new Error('Não utilizado'); }, async obter() { return []; }, async reivindicarPublicacao() { throw new Error('Não utilizado'); }, async reivindicarLimpeza() { count++; return { id: String(count), proprietarioId: 'ator', chaveTemporaria: 'temp', chavePublica: 'public', estado: 'removendo', version: '1', expiraEm: new Date(), leaseId: 'lease' }; }, async atualizar() { removed++; }, async falhou() { failed++; } };
  const cleanup = new LimpezaImagens(repo, { async enviarTemporaria() { throw new Error('Não utilizado'); }, async publicar() { throw new Error('Não utilizado'); }, async consultar() { return null; }, async remover() { concurrent++; await Promise.resolve(); if (count === 1) throw new Error('Rede'); }, url() { return ''; } });
  const first = cleanup.executarLote(100); assert.equal(cleanup.executarLote(100), first); await first;
  assert.equal(count, 20); assert.equal(failed, 1); assert.equal(removed, 19); assert.equal(concurrent, 39); await cleanup.onModuleDestroy();
});
