// Fixtures isoladas; não modifica contas, reservas ou fotos reais.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPool, type RowDataPacket } from 'mysql2/promise';
import { validateEnvironment } from './config/environment';
import { buildPoolOptions } from './database/database.service';
import { RepositorioCatalogoAdministrativoMysql } from './repositories/mysql/repositorio-catalogo-administrativo-mysql';
import { RepositorioArquivosImagensMysql } from './repositories/mysql/repositorio-arquivos-imagens-mysql';
import { TokenSessao } from './security/token-sessao';
import type { AtorAdministrativo } from './security/acesso-administrativo';
import type { ArmazenamentoImagens } from './storage/armazenamento-imagens';
import type { DadosSala, DadosUnidade } from './dto/catalogo-administrativo.dto';
async function check(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Somente local.');
  const config = validateEnvironment(process.env); const pool = createPool(buildPoolOptions(config.db));
  const storage: ArmazenamentoImagens = { async enviarTemporaria() { throw new Error('Não utilizado'); }, async publicar() { throw new Error('Não utilizado'); }, async consultar() { return null; }, async remover() {}, url(key) { return 'https://example.invalid/' + key; } };
  const repo = new RepositorioCatalogoAdministrativoMysql(config.db, storage); const files = new RepositorioArquivosImagensMysql(config.db, 'connect2work/testes');
  const actorId = randomUUID(), unitId = randomUUID(), roomId = randomUUID(), secondRoomId = randomUUID(), bookingId = randomUUID(), sessionId = randomUUID(); const token = new TokenSessao().gerar();
  const actor: AtorAdministrativo = { id: actorId, name: 'Teste Catálogo', role: 'admin', tokenHash: token.hash };
  const amenities = ['Teste Comodidade ' + randomUUID(), 'Teste Comodidade ' + randomUUID()]; const fileIds: string[] = [];
  const serviceId = randomUUID(); const rollbackId = randomUUID(); const auditId = randomUUID(); const rollbackRepo = new RepositorioCatalogoAdministrativoMysql(config.db, storage, undefined, () => auditId);
  try {
    await pool.execute('INSERT INTO usuarios(id,perfil_id,nome,email,ativo) SELECT ?,id,?,?,1 FROM perfis WHERE codigo=?', [actorId, actor.name, actorId + '@example.invalid', 'admin']);
    const now = new Date(); await pool.execute('INSERT INTO sessoes(id,usuario_id,token_hash,criado_em,ultima_atividade_em,expira_em) VALUES(?,?,?,?,?,?)', [sessionId, actorId, token.hash, now, now, new Date(now.getTime() + 14400000)]);
    const unit: DadosUnidade = { type: 'unit', name: 'Teste ' + unitId, address: 'Rua de Teste', description: '', latitude: null, longitude: null };
    await pool.execute('INSERT INTO registros_auditoria(id,usuario_id,acao,entidade,entidade_id) VALUES(?,?,?,?,?)', [auditId, actorId, 'teste', 'unit', rollbackId]);
    await assert.rejects(rollbackRepo.gravar(actor, { entidade: 'unit', acao: 'create', id: rollbackId, data: unit }), { status: 409 });
    assert.equal((await repo.listarUnidades({ search: unitId, page: 1, pageSize: 10 })).total, 0);
    const created = await repo.gravar(actor, { entidade: 'unit', acao: 'create', id: unitId, data: unit }); assert.ok(created);
    assert.deepEqual(await repo.gravar(actor, { entidade: 'unit', acao: 'create', id: unitId, data: unit }), created);
    await pool.execute('UPDATE unidades SET chave_imagem=? WHERE id=?', ['unidades/fachada-antiga.jpg', unitId]);
    const legacyUnit = (await repo.listarUnidades({ search: unitId, page: 1, pageSize: 10 })).items[0]; assert.ok(legacyUnit); assert.equal(legacyUnit.imageId, 'legacy:' + unitId); assert.equal(legacyUnit.imageUrl, null);
    await repo.gravar(actor, { entidade: 'unit', acao: 'update', id: unitId, expectedVersion: legacyUnit.version, data: { ...unit, imageId: legacyUnit.imageId } });
    const [legacyStored] = await pool.execute<RowDataPacket[]>('SELECT chave_imagem FROM unidades WHERE id=?', [unitId]); assert.equal(legacyStored[0]?.chave_imagem, 'unidades/fachada-antiga.jpg');
    await assert.rejects(repo.gravar(actor, { entidade: 'unit', acao: 'create', id: unitId, data: { ...unit, name: 'Outro' } }), { status: 409 });
    const [existingTypes] = await pool.execute<RowDataPacket[]>('SELECT tipo FROM servicos_empresariais');
    if (!existingTypes.some(row => row.tipo === 'endereco_fiscal')) {
      const data = { type: 'service' as const, kind: 'fiscal_address' as const, name: 'Serviço Teste ' + serviceId, description: 'Descrição de teste', primaryFeatures: ['Primeiro', 'Segundo'], secondaryFeatures: ['Terceiro'], active: true, sortOrder: 0, imageId: null };
      const createdService = await repo.gravar(actor, { entidade: 'service', acao: 'create', id: serviceId, data });
      assert.ok(createdService && 'kind' in createdService);
      assert.deepEqual(createdService.primaryFeatures, ['Primeiro', 'Segundo']);
      assert.deepEqual(await repo.gravar(actor, { entidade: 'service', acao: 'create', id: serviceId, data }), createdService);
      await assert.rejects(repo.gravar(actor, { entidade: 'service', acao: 'update', id: serviceId, expectedVersion: '2020-01-01 00:00:00.000001', data }), { status: 409 });
      await assert.rejects(rollbackRepo.gravar(actor, { entidade: 'service', acao: 'update', id: serviceId, expectedVersion: createdService.version, data: { ...data, primaryFeatures: ['Falha'] } }), { status: 409 });
      assert.deepEqual((await repo.listarServicos(true)).find(row => row.id === serviceId)?.primaryFeatures, ['Primeiro', 'Segundo']);
      const hidden = await repo.gravar(actor, { entidade: 'service', acao: 'update', id: serviceId, expectedVersion: createdService.version, data: { ...data, active: false, primaryFeatures: ['Atualizado'] } });
      assert.ok(hidden && 'kind' in hidden && !hidden.active);
      assert.equal((await repo.listarServicos(false)).some(row => row.id === serviceId), false);
      assert.deepEqual((await repo.listarServicos(true)).find(row => row.id === serviceId)?.primaryFeatures, ['Atualizado']);
      console.info('Serviços MySQL: criação, benefícios ordenados, idempotência, versão, rollback e visibilidade OK.');
    }
    const room: DadosSala = { type: 'room', name: 'Teste ' + roomId, unitId, capacity: 4, pricePerHour: 50, amenities, imageIds: [] };
    const r = await repo.gravar(actor, { entidade: 'room', acao: 'create', id: roomId, data: room }); assert.ok(r && 'amenities' in r); assert.deepEqual(r.amenities, amenities.slice().sort());
    const unitPage = await repo.listarUnidades({ search: unitId, page: 1, pageSize: 10 }); assert.equal(unitPage.items[0]?.availableRooms, 1);
    await assert.rejects(repo.gravar(actor, { entidade: 'unit', acao: 'delete', id: unitId, expectedVersion: created.version }), { status: 409 });
    const changed = await Promise.allSettled(['Uma', 'Outra'].map(name => repo.gravar(actor, { entidade: 'room', acao: 'update', id: roomId, expectedVersion: r.version, data: { ...room, name } })));
    assert.equal(changed.filter(x => x.status === 'fulfilled').length, 1); assert.equal(changed.filter(x => x.status === 'rejected').length, 1);
    let current = (await repo.listarSalas({ search: '', unitId, page: 1, pageSize: 10 })).items[0]; assert.ok(current);
    const legacyPhotoId = randomUUID(); await pool.execute('INSERT INTO imagens_salas(id,sala_id,chave_arquivo,posicao) VALUES(?,?,?,0)', [legacyPhotoId, roomId, 'salas/foto-antiga.jpg']);
    current = (await repo.listarSalas({ search: '', unitId, page: 1, pageSize: 10 })).items[0]; assert.ok(current); assert.deepEqual(current.imageIds, ['legacy:' + legacyPhotoId]); assert.equal(current.images.length, 0);
    const legacyRoomSaved = await repo.gravar(actor, { entidade: 'room', acao: 'update', id: roomId, expectedVersion: current.version, data: { ...room, imageIds: current.imageIds } }); assert.ok(legacyRoomSaved && 'images' in legacyRoomSaved); current = legacyRoomSaved;
    const [legacyPhotoStored] = await pool.execute<RowDataPacket[]>('SELECT chave_arquivo FROM imagens_salas WHERE sala_id=?', [roomId]); assert.equal(legacyPhotoStored[0]?.chave_arquivo, 'salas/foto-antiga.jpg');
    // Arquivo artificial: testa protocolo SQL sem criar recurso no provedor.
    const image = await files.registrar(actor, { bytes: 100, largura: 10, altura: 10 }); fileIds.push(image.id); assert.ok(image.leaseId);
    await assert.rejects(files.atualizar(image.id, randomUUID(), 'temporario'), { status: 409 });
    await files.atualizar(image.id, image.leaseId, 'temporario', { chave: image.chaveTemporaria, version: '1', formato: 'webp', bytes: 100, largura: 10, altura: 10 });
    const publishing = await files.reivindicarPublicacao(actor, image.id); assert.ok(publishing.leaseId);
    await files.atualizar(image.id, publishing.leaseId, 'disponivel', { chave: image.chavePublica, version: '2', formato: 'webp', bytes: 100, largura: 10, altura: 10 });
    await assert.rejects(rollbackRepo.gravar(actor, { entidade: 'room', acao: 'update', id: roomId, expectedVersion: current.version, data: { ...room, imageIds: [image.id] } }), { status: 409 });
    const preserved = (await repo.listarSalas({ search: '', unitId, page: 1, pageSize: 10 })).items[0]; assert.ok(preserved); assert.equal(preserved.version, current.version); assert.equal(preserved.images.length, 0); assert.equal((await files.obter([image.id]))[0]?.estado, 'disponivel');
    const pictured = await repo.gravar(actor, { entidade: 'room', acao: 'update', id: roomId, expectedVersion: current.version, data: { ...room, imageIds: [image.id] } }); assert.ok(pictured && 'images' in pictured); assert.equal(pictured.images[0]?.id, image.id);
    await assert.rejects(repo.gravar(actor, { entidade: 'room', acao: 'create', id: secondRoomId, data: { ...room, imageIds: [image.id] } }), { status: 409 });
    const removed = await repo.gravar(actor, { entidade: 'room', acao: 'update', id: roomId, expectedVersion: pictured.version, data: room }); assert.ok(removed);
    assert.equal((await files.obter([image.id]))[0]?.estado, 'removendo'); assert.equal(await files.reivindicarLimpeza(), null);
    // SQL da retentativa é exercitado em MySQL real.
    const retry = await files.registrar(actor, { bytes: 100, largura: 10, altura: 10 }); fileIds.push(retry.id); assert.ok(retry.leaseId); await files.falhou(retry.id, retry.leaseId);
    await pool.execute('INSERT INTO agendamentos(id,usuario_id,sala_id,inicio_em,fim_em,valor_acordado) VALUES(?,?,?,UTC_TIMESTAMP(6),DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 1 HOUR),50)', [bookingId, actorId, roomId]);
    await assert.rejects(repo.gravar(actor, { entidade: 'room', acao: 'delete', id: roomId, expectedVersion: removed.version }), { status: 409 });
    await pool.execute('DELETE FROM agendamentos WHERE id=?', [bookingId]);
    await repo.gravar(actor, { entidade: 'room', acao: 'delete', id: roomId, expectedVersion: removed.version });
    const latest = (await repo.listarUnidades({ search: unitId, page: 1, pageSize: 10 })).items[0]; assert.ok(latest);
    await repo.gravar(actor, { entidade: 'unit', acao: 'delete', id: unitId, expectedVersion: latest.version });
    await assert.rejects(repo.gravar(actor, { entidade: 'unit', acao: 'create', id: unitId, data: unit }), { status: 409 });
    const [audits] = await pool.execute<RowDataPacket[]>('SELECT id FROM registros_auditoria WHERE usuario_id=?', [actorId]); assert.ok(audits.length >= 6);
    console.log('Catálogo MySQL: CRUD, versão concorrente, idempotência, vínculos, imagens e auditoria OK.');
  } finally {
    await pool.execute('DELETE FROM beneficios_servicos WHERE servico_id=?', [serviceId]);
    await pool.execute('DELETE FROM servicos_empresariais WHERE id=?', [serviceId]);
    await pool.execute('DELETE FROM agendamentos WHERE id=?', [bookingId]);
    for (const id of [roomId, secondRoomId]) await pool.execute('DELETE FROM salas WHERE id=?', [id]);
    await pool.execute('DELETE FROM unidades WHERE id=?', [unitId]);
    await pool.execute('DELETE FROM unidades WHERE id=?', [rollbackId]);
    for (const name of amenities) await pool.execute('DELETE FROM comodidades WHERE nome=?', [name]);
    for (const id of fileIds) await pool.execute('DELETE FROM arquivos_imagens WHERE id=?', [id]);
    await pool.execute('DELETE FROM registros_auditoria WHERE usuario_id=?', [actorId]); await pool.execute('DELETE FROM sessoes WHERE usuario_id=?', [actorId]); await pool.execute('DELETE FROM usuarios WHERE id=?', [actorId]);
    await repo.onModuleDestroy(); await rollbackRepo.onModuleDestroy(); await files.onModuleDestroy(); await pool.end();
  }
}
check().catch(() => { console.error('Verificação do catálogo falhou; confira código e fixtures locais.'); process.exitCode = 1; });
