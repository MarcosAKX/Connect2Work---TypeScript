import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ServicoImagens } from '../src/services/servico-imagens';
import { AcessoAdministrativo } from '../src/security/acesso-administrativo';
import { TokenSessao } from '../src/security/token-sessao';
import type { RepositorioArquivosImagens } from '../src/repositories/contracts/repositorio-arquivos-imagens';
import type { ArquivoImagem } from '../src/repositories/contracts/repositorio-arquivos-imagens';
import { randomUUID } from 'node:crypto';
test('upload nega acesso antes de decodificar ou enviar arquivo para armazenamento', async () => {
  let calls = 0; const unused = async (): Promise<never> => { calls++; throw new Error('Não deveria chegar aqui'); };
  const repo: RepositorioArquivosImagens = { registrar: unused, obter: unused, reivindicarPublicacao: unused, atualizar: unused, reivindicarLimpeza: unused, falhou: unused };
  const storage = { enviarTemporaria: unused, publicar: unused, consultar: unused, remover: unused, url() { calls++; return ''; } };
  const auth = new AcessoAdministrativo({ async consultar() { return null; } });
  const service = new ServicoImagens(repo, storage, auth);
  await assert.rejects(service.enviar(new TokenSessao().gerar().token, {}), { status: 401 }); assert.equal(calls, 0);
});
test('publicação com resposta perdida é retomada por consulta sem publicar nem remover novamente', async () => {
  const actor = { id: randomUUID(), name: 'Admin', role: 'admin' as const, tokenHash: Buffer.alloc(32) };
  const row: ArquivoImagem = { id: randomUUID(), proprietarioId: actor.id, chaveTemporaria: 'temp', chavePublica: 'public', estado: 'temporario', version: '1', expiraEm: new Date(Date.now() + 86400000), leaseId: null };
  let published = false, publications = 0, removals = 0, failures = 0;
  const meta = { chave: 'public', version: '2', formato: 'webp' as const, bytes: 100, largura: 10, altura: 10 };
  const repo: RepositorioArquivosImagens = { async registrar() { throw new Error('Não utilizado'); }, async obter() { return [row]; }, async reivindicarLimpeza() { return null; }, async reivindicarPublicacao() { row.estado = 'publicando'; row.leaseId = randomUUID(); return { ...row }; }, async atualizar(_id, _lease, state) { row.estado = state; row.version = meta.version; row.leaseId = null; }, async falhou() { failures++; row.leaseId = null; } };
  const service = new ServicoImagens(repo, { async enviarTemporaria() { throw new Error('Não utilizado'); }, async consultar() { return published ? meta : null; }, async publicar() { publications++; published = true; throw new Error('Resposta perdida após operação remota'); }, async remover() { removals++; }, url() { return ''; } }, new AcessoAdministrativo({ async consultar() { return null; } }));
  await assert.rejects(service.prepararVinculo(actor, [row.id]), { status: 503 }); assert.equal(failures, 1); assert.equal(row.estado, 'publicando');
  await service.prepararVinculo(actor, [row.id]); assert.equal(row.estado, 'disponivel'); assert.equal(publications, 1); assert.equal(removals, 0);
});
