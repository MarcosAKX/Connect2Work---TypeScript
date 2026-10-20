import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException, type OnModuleDestroy } from '@nestjs/common';
import { createPool, type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import type { DatabaseConfig } from '../../config/environment';
import { buildPoolOptions } from '../../database/database.service';
import type { CatalogoDto, ServicoEmpresarialDto, DadosServico, TipoServico, ConsultaCatalogo, DadosSala, DadosUnidade, SalaAdministrativaDto, UnidadeAdministrativaDto } from '../../dto/catalogo-administrativo.dto';
import type { AtorAdministrativo } from '../../security/acesso-administrativo';
import { bloquearAcessoAdministrativo } from '../../security/transacao-administrativa';
import { RelogioSistema, type Relogio } from '../../security/relogio';
import type { ArmazenamentoImagens } from '../../storage/armazenamento-imagens';
import type { OperacaoCatalogo, RepositorioCatalogoAdministrativo } from '../contracts/repositorio-catalogo-administrativo';
import { bancoAdministrativo } from './banco-administrativo';
import { possuiReferencia, type LinhaArquivo } from './repositorio-arquivos-imagens-mysql';
import { resolverImagens } from './resolver-imagens';
interface Unidade extends RowDataPacket { id: string; nome: string; endereco: string; descricao: string | null; latitude: string | null; longitude: string | null; chave_imagem: string | null; versao: string; total_salas: number; }
interface Sala extends RowDataPacket { id: string; unidade_id: string; unidade_nome: string; nome: string; capacidade: number; preco_por_hora: string; versao: string; }
interface Foto extends RowDataPacket { id: string; sala_id: string; chave_arquivo: string; }
interface Comodidade extends RowDataPacket { sala_id: string; nome: string; }
interface Contagem extends RowDataPacket { total: number; }
const VERSION = "DATE_FORMAT(atualizado_em,'%Y-%m-%d %H:%i:%s.%f')";
const tipos: Record<TipoServico, string> = { fiscal_address: 'endereco_fiscal', commercial_address: 'endereco_comercial', hours_plan: 'plano_horas' };
const legacy = (key: string) => /^(https:\/\/|\/(?!\/))/.test(key);
export class RepositorioCatalogoAdministrativoMysql implements RepositorioCatalogoAdministrativo, OnModuleDestroy {
  private readonly pool: Pool;
  constructor(config: DatabaseConfig, private readonly storage: ArmazenamentoImagens, private readonly clock: Relogio = new RelogioSistema(), private readonly novoIdAuditoria: () => string = randomUUID) { this.pool = createPool(buildPoolOptions(config)); }
  private async unidades(c: PoolConnection, where: string, params: string[], limit = ''): Promise<UnidadeAdministrativaDto[]> {
    const [rows] = await c.execute<Unidade[]>({ sql: `SELECT u.*,${VERSION.replaceAll('atualizado_em', 'u.atualizado_em')} versao,(SELECT COUNT(*) FROM salas s WHERE s.unidade_id=u.id) total_salas FROM unidades u WHERE ${where} ORDER BY u.nome,u.id ${limit}`, timeout: 2000 }, params);
    const images = await resolverImagens(c, rows.flatMap(r => r.chave_imagem ? [r.chave_imagem] : []), this.storage);
    return rows.map(r => { const image = r.chave_imagem ? images.get(r.chave_imagem) : undefined; return { id: r.id, name: r.nome, address: r.endereco, description: r.descricao ?? '', availableRooms: Number(r.total_salas), version: r.versao, imageId: image?.id ?? (r.chave_imagem ? 'legacy:' + r.id : null), imageUrl: image?.url ?? (r.chave_imagem && legacy(r.chave_imagem) ? r.chave_imagem : null), ...(r.latitude !== null && r.longitude !== null ? { latitude: Number(r.latitude), longitude: Number(r.longitude) } : {}) }; });
  }
  private async salas(c: PoolConnection, where: string, params: string[], limit = ''): Promise<SalaAdministrativaDto[]> {
    const [rows] = await c.execute<Sala[]>({ sql: `SELECT s.*,u.nome unidade_nome,${VERSION.replaceAll('atualizado_em', 's.atualizado_em')} versao FROM salas s JOIN unidades u ON u.id=s.unidade_id WHERE ${where} ORDER BY s.nome,s.id ${limit}`, timeout: 2000 }, params);
    if (!rows.length) return [];
    const ids = rows.map(r => r.id); const placeholders = ids.map(() => '?').join(',');
    const [photos] = await c.execute<Foto[]>({ sql: `SELECT id,sala_id,chave_arquivo FROM imagens_salas WHERE sala_id IN (${placeholders}) ORDER BY sala_id,posicao,id`, timeout: 2000 }, ids);
    const [amenities] = await c.execute<Comodidade[]>({ sql: `SELECT sc.sala_id,c.nome FROM sala_comodidades sc JOIN comodidades c ON c.id=sc.comodidade_id WHERE sc.sala_id IN (${placeholders}) ORDER BY c.nome,c.id`, timeout: 2000 }, ids);
    const resolved = await resolverImagens(c, photos.map(p => p.chave_arquivo), this.storage);
    return rows.map(r => { const images = photos.filter(p => p.sala_id === r.id).flatMap(p => { const image = resolved.get(p.chave_arquivo); return image ? [image] : legacy(p.chave_arquivo) ? [{ id: 'legacy:' + p.id, url: p.chave_arquivo }] : []; }); return { id: r.id, unitId: r.unidade_id, unitName: r.unidade_nome, name: r.nome, capacity: r.capacidade, pricePerHour: Number(r.preco_por_hora), version: r.versao, imageIds: photos.filter(p => p.sala_id === r.id).map(p => resolved.get(p.chave_arquivo)?.id ?? 'legacy:' + p.id), amenities: amenities.filter(a => a.sala_id === r.id).map(a => a.nome), images, imageUrls: images.map(i => i.url), imageUrl: images[0]?.url ?? null }; });
  }
  async listarUnidades(q: ConsultaCatalogo) { return bancoAdministrativo(this.pool, async c => {
    await c.beginTransaction(); try { const where = "LOCATE(?,CONCAT(u.nome,' ',u.endereco))>0"; const [count] = await c.execute<Contagem[]>({ sql: 'SELECT COUNT(*) total FROM unidades u WHERE ' + where, timeout: 2000 }, [q.search]); const items = await this.unidades(c, where, [q.search], `LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`); await c.commit(); return { items, total: Number(count[0]?.total ?? 0), page: q.page, pageSize: q.pageSize }; } catch (error: unknown) { await c.rollback(); throw error; }
  }); }
  async listarSalas(q: ConsultaCatalogo) { return bancoAdministrativo(this.pool, async c => {
    await c.beginTransaction(); try { const where = "LOCATE(?,CONCAT(s.nome,' ',u.nome))>0" + (q.unitId ? ' AND s.unidade_id=?' : ''); const params = [q.search, ...(q.unitId ? [q.unitId] : [])]; const [count] = await c.execute<Contagem[]>({ sql: 'SELECT COUNT(*) total FROM salas s JOIN unidades u ON u.id=s.unidade_id WHERE ' + where, timeout: 2000 }, params); const items = await this.salas(c, where, params, `LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`); await c.commit(); return { items, total: Number(count[0]?.total ?? 0), page: q.page, pageSize: q.pageSize }; } catch (error: unknown) { await c.rollback(); throw error; }
  }); }
  async opcoes(search: string) { return bancoAdministrativo(this.pool, async c => { const [rows] = await c.execute<Unidade[]>({ sql: 'SELECT id,nome FROM unidades WHERE LOCATE(?,nome)>0 ORDER BY nome,id LIMIT 100', timeout: 2000 }, [search]); return rows.map(r => ({ id: r.id, name: r.nome })); }); }
  private async buscar(c: PoolConnection, op: OperacaoCatalogo): Promise<CatalogoDto | null> { if (op.entidade === 'service') return (await this.servicos(c, true, op.id))[0] ?? null; return op.entidade === 'unit' ? (await this.unidades(c, 'u.id=?', [op.id]))[0] ?? null : (await this.salas(c, 's.id=?', [op.id]))[0] ?? null; }
  private async chaves(c: PoolConnection, op: OperacaoCatalogo): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (op.entidade === 'service') { const [rows] = await c.execute<Unidade[]>('SELECT chave_imagem FROM servicos_empresariais WHERE id=?', [op.id]); const key = rows[0]?.chave_imagem; if (key) map.set('legacy:' + op.id, key); }
    else if (op.entidade === 'unit') { const [rows] = await c.execute<Unidade[]>('SELECT chave_imagem FROM unidades WHERE id=?', [op.id]); const key = rows[0]?.chave_imagem; if (key) map.set('legacy:' + op.id, key); }
    else { const [rows] = await c.execute<Foto[]>('SELECT id,chave_arquivo FROM imagens_salas WHERE sala_id=? ORDER BY posicao,id', [op.id]); for (const r of rows) map.set('legacy:' + r.id, r.chave_arquivo); }
    return map;
  }
  private async validarImagens(c: PoolConnection, ids: readonly string[], old: Map<string, string>, actor: AtorAdministrativo, now: Date): Promise<string[]> {
    const managed = ids.filter(id => !id.startsWith('legacy:')).sort();
    const [rows] = managed.length ? await c.execute<LinhaArquivo[]>({ sql: `SELECT * FROM arquivos_imagens WHERE id IN (${managed.map(() => '?').join(',')}) ORDER BY id FOR UPDATE`, timeout: 2000 }, managed) : [[]];
    const keys: string[] = [];
    for (const id of ids) {
      if (id.startsWith('legacy:')) { const key = old.get(id); if (!key) throw new ConflictException('Imagem não pertence a este cadastro.'); const [registered] = await c.execute<LinhaArquivo[]>('SELECT * FROM arquivos_imagens WHERE chave_publica=? FOR UPDATE', [key]); if (registered[0] && registered[0].estado !== 'vinculado') throw new ConflictException('Imagem em processamento. Atualize a lista.'); keys.push(key); continue; }
      const row = rows.find(r => r.id === id); if (!row || !row.versao_cloudinary) throw new ConflictException('Imagem indisponível.');
      const current = [...old.values()].includes(row.chave_publica);
      if (!(current && row.estado === 'vinculado') && !(row.estado === 'disponivel' && row.proprietario_id === actor.id && row.expira_em > now)) throw new ConflictException('Imagem não pertence a este cadastro ou expirou.');
      keys.push(row.chave_publica);
    }
    if (new Set(keys).size !== keys.length) throw new ConflictException('Não repita uma imagem na galeria.'); return keys;
  }
  private async registrarImagens(c: PoolConnection, old: readonly string[], next: readonly string[], now: Date): Promise<void> {
    for (const key of [...new Set([...old, ...next])].sort()) {
      if (legacy(key)) continue;
      const [rows] = await c.execute<LinhaArquivo[]>('SELECT * FROM arquivos_imagens WHERE chave_publica=? FOR UPDATE', [key]); if (!rows[0]) continue;
      if (next.includes(key)) { if (!['vinculado','disponivel'].includes(rows[0].estado)) throw new ConflictException('Imagem em processamento. Atualize a lista.'); await c.execute("UPDATE arquivos_imagens SET estado='vinculado',lease_id=NULL,lease_ate=NULL,proxima_tentativa_em=NULL,atualizado_em=? WHERE id=?", [now, rows[0].id]); }
      else if (!await possuiReferencia(c, key)) await c.execute("UPDATE arquivos_imagens SET estado='removendo',lease_id=NULL,lease_ate=NULL,proxima_tentativa_em=?,atualizado_em=? WHERE id=?", [new Date(now.getTime() + 86400000), now, rows[0].id]);
    }
  }
  private async salvarUnidade(c: PoolConnection, id: string, data: DadosUnidade, create: boolean, keys: string[], now: Date): Promise<void> {
    const values = [data.name, data.address, data.description || null, keys[0] ?? null, data.latitude, data.longitude];
    if (create) await c.execute('INSERT INTO unidades(id,nome,endereco,descricao,chave_imagem,latitude,longitude,criado_em,atualizado_em) VALUES(?,?,?,?,?,?,?,?,?)', [id, ...values, now, now]);
    else await c.execute('UPDATE unidades SET nome=?,endereco=?,descricao=?,chave_imagem=?,latitude=?,longitude=?,atualizado_em=GREATEST(?,DATE_ADD(atualizado_em,INTERVAL 1 MICROSECOND)) WHERE id=?', [...values, now, id]);
  }
  private async salvarSala(c: PoolConnection, id: string, data: DadosSala, create: boolean, keys: string[], now: Date): Promise<void> {
    const [units] = await c.execute<RowDataPacket[]>('SELECT id FROM unidades WHERE id=? FOR UPDATE', [data.unitId]); if (!units.length) throw new ConflictException('Unidade não encontrada.');
    if (create) await c.execute('INSERT INTO salas(id,unidade_id,nome,capacidade,preco_por_hora,criado_em,atualizado_em) VALUES(?,?,?,?,?,?,?)', [id, data.unitId, data.name, data.capacity, data.pricePerHour, now, now]);
    else await c.execute('UPDATE salas SET unidade_id=?,nome=?,capacidade=?,preco_por_hora=?,atualizado_em=GREATEST(?,DATE_ADD(atualizado_em,INTERVAL 1 MICROSECOND)) WHERE id=?', [data.unitId, data.name, data.capacity, data.pricePerHour, now, id]);
    await c.execute('DELETE FROM sala_comodidades WHERE sala_id=?', [id]);
    const linked = new Set<string>();
    for (const name of data.amenities) {
      await c.execute('INSERT INTO comodidades(id,nome) VALUES(?,?) ON DUPLICATE KEY UPDATE nome=nome', [randomUUID(), name]);
      const [rows] = await c.execute<(RowDataPacket & { id: string })[]>('SELECT id FROM comodidades WHERE nome=?', [name]); const amenity = rows[0]?.id; if (!amenity) throw new Error('Comodidade ausente.');
      if (!linked.has(amenity)) { await c.execute('INSERT INTO sala_comodidades(sala_id,comodidade_id) VALUES(?,?)', [id, amenity]); linked.add(amenity); }
    }
    await c.execute('DELETE FROM imagens_salas WHERE sala_id=?', [id]);
    for (const [position, key] of keys.entries()) await c.execute('INSERT INTO imagens_salas(id,sala_id,chave_arquivo,posicao,criado_em) VALUES(?,?,?,?,?)', [randomUUID(), id, key, position, now]);
  }
  async gravar(actor: AtorAdministrativo, op: OperacaoCatalogo): Promise<CatalogoDto | null> { return bancoAdministrativo(this.pool, async c => {
    await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'); await c.beginTransaction();
    try {
      const auth = await bloquearAcessoAdministrativo(c, actor, this.clock); const now = auth.agora; const table = op.entidade === 'unit' ? 'unidades' : op.entidade === 'room' ? 'salas' : 'servicos_empresariais';
      await c.execute(`SELECT id FROM ${table} WHERE id=? FOR UPDATE`, [op.id]);
      const before = await this.buscar(c, op); const fingerprint = createHash('sha256').update(JSON.stringify(op.data ?? null)).digest('hex');
      if (op.acao === 'create' && !before) { const [history] = await c.execute<RowDataPacket[]>("SELECT id FROM registros_auditoria WHERE entidade=? AND entidade_id=? AND acao='create' LIMIT 1", [op.entidade, op.id]); if (history.length) throw new ConflictException('Operação já concluída e cadastro removido. Atualize a lista.'); }
      if (op.acao === 'create' && before) {
        const [audit] = await c.execute<RowDataPacket[]>("SELECT id FROM registros_auditoria WHERE usuario_id=? AND entidade=? AND entidade_id=? AND acao='create' AND JSON_UNQUOTE(JSON_EXTRACT(detalhes,'$.fingerprint'))=? LIMIT 1", [actor.id, op.entidade, op.id, fingerprint]);
        if (!audit.length) throw new ConflictException('Identificador já utilizado. Atualize a lista.'); await c.commit(); return before;
      }
      if (op.acao !== 'create' && !before) throw new NotFoundException('Cadastro não encontrado.');
      if (before && before.version !== op.expectedVersion) throw new ConflictException('Este cadastro foi alterado. Atualize a lista antes de editar.');
      if (op.entidade === 'room' && before && 'unitId' in before && (op.acao === 'delete' || op.data?.type === 'room' && op.data.unitId !== before.unitId)) {
        const [bookings] = await c.execute<RowDataPacket[]>('SELECT id FROM agendamentos WHERE sala_id=? LIMIT 1', [op.id]); if (bookings.length) throw new ConflictException('Sala com agendamentos não pode ser excluída ou mudar de unidade.');
      }
      const old = await this.chaves(c, op); let next = [...old.values()];
      if (op.acao === 'delete') { await c.execute(`DELETE FROM ${table} WHERE id=?`, [op.id]); next = []; }
      else {
        const data = op.data; if (!data || data.type !== op.entidade) throw new Error('Operação inválida.');
        const imageIds = data.type !== 'room' ? data.imageId === undefined ? undefined : data.imageId === null ? [] : [data.imageId] : data.imageIds;
        if (imageIds !== undefined) next = await this.validarImagens(c, imageIds, old, actor, now);
        if (data.type === 'unit') await this.salvarUnidade(c, op.id, data, op.acao === 'create', next, now);
        else if (data.type === 'room') await this.salvarSala(c, op.id, data, op.acao === 'create', next, now);
        else {
          if (before && 'kind' in before && before.kind !== data.kind) throw new ConflictException('O tipo do serviço não pode ser alterado.');
          await this.salvarServico(c, op.id, data, op.acao === 'create', next, now);
        }
      }
      await this.registrarImagens(c, [...old.values()], next, now);
      await c.execute('INSERT INTO registros_auditoria(id,usuario_id,nome_usuario,acao,entidade,entidade_id,detalhes,ocorrido_em) VALUES(?,?,?,?,?,?,?,?)', [this.novoIdAuditoria(), auth.id, auth.name, op.acao, op.entidade, op.id, JSON.stringify({ source: 'administracao', fingerprint, requestId: op.acao === 'create' ? op.id : null }), now]);
      const result = op.acao === 'delete' ? null : await this.buscar(c, op); await c.commit(); return result;
    } catch (error: unknown) { await c.rollback(); throw error; }
  }); }
  private async servicos(c: PoolConnection, includeInactive: boolean, id?: string): Promise<ServicoEmpresarialDto[]> {
    interface Servico extends RowDataPacket { id: string; tipo: string; nome: string; descricao: string; chave_imagem: string | null; ativo: number; ordem: number; versao: string; }
    interface Beneficio extends RowDataPacket { servico_id: string; categoria: string; descricao: string; }
    const [rows] = await c.execute<Servico[]>({ sql: `SELECT *,${VERSION} versao FROM servicos_empresariais WHERE ${id ? 'id=?' : includeInactive ? '1=1' : 'ativo=1'} ORDER BY ordem,id LIMIT 3`, timeout: 2000 }, id ? [id] : []);
    if (!rows.length) return [];
    const [benefits] = await c.execute<Beneficio[]>({ sql: `SELECT servico_id,categoria,descricao FROM beneficios_servicos WHERE servico_id IN (${rows.map(() => '?').join(',')}) ORDER BY servico_id,categoria,ordem,id`, timeout: 2000 }, rows.map(row => row.id));
    const resolved = await resolverImagens(c, rows.flatMap(row => row.chave_imagem ? [row.chave_imagem] : []), this.storage);
    return rows.map(row => {
      const kind = (Object.keys(tipos) as TipoServico[]).find(key => tipos[key] === row.tipo);
      if (!kind) throw new Error('Tipo de serviço inválido.');
      const image = row.chave_imagem ? resolved.get(row.chave_imagem) : undefined;
      return { id: row.id, kind, name: row.nome, description: row.descricao, active: row.ativo === 1, sortOrder: row.ordem,
        primaryFeatures: benefits.filter(b => b.servico_id === row.id && b.categoria === 'principal').map(b => b.descricao),
        secondaryFeatures: benefits.filter(b => b.servico_id === row.id && b.categoria === 'secundario').map(b => b.descricao),
        version: row.versao, imageUrl: image?.url ?? (row.chave_imagem && legacy(row.chave_imagem) ? row.chave_imagem : null),
        ...(includeInactive ? { version: row.versao, imageId: image?.id ?? (row.chave_imagem ? 'legacy:' + row.id : null) } : {}) };
    });
  }
  async listarServicos(includeInactive: boolean) {
    return bancoAdministrativo(this.pool, async c => {
      await c.beginTransaction();
      try { const items = await this.servicos(c, includeInactive); await c.commit(); return items; }
      catch (error: unknown) { await c.rollback(); throw error; }
    });
  }
  private async salvarServico(c: PoolConnection, id: string, data: DadosServico, create: boolean, keys: string[], now: Date): Promise<void> {
    const values = [tipos[data.kind], data.name, data.description, keys[0] ?? null, data.active ? 1 : 0, data.sortOrder];
    if (create) await c.execute('INSERT INTO servicos_empresariais(id,tipo,nome,descricao,chave_imagem,ativo,ordem,criado_em,atualizado_em) VALUES(?,?,?,?,?,?,?,?,?)', [id, ...values, now, now]);
    else await c.execute('UPDATE servicos_empresariais SET tipo=?,nome=?,descricao=?,chave_imagem=?,ativo=?,ordem=?,atualizado_em=GREATEST(?,DATE_ADD(atualizado_em,INTERVAL 1 MICROSECOND)) WHERE id=?', [...values, now, id]);
    await c.execute('DELETE FROM beneficios_servicos WHERE servico_id=?', [id]);
    for (const [category, items] of [['principal', data.primaryFeatures], ['secundario', data.secondaryFeatures]] as const) {
      for (const [position, description] of items.entries()) await c.execute('INSERT INTO beneficios_servicos(id,servico_id,categoria,descricao,ordem) VALUES(?,?,?,?,?)', [randomUUID(), id, category, description, position]);
    }
  }
  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}
