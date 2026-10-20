import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException, type OnModuleDestroy } from '@nestjs/common';
import { createPool, type Pool, type PoolConnection, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import type { DatabaseConfig } from '../../config/environment';
import { buildPoolOptions } from '../../database/database.service';
import type { AtorAdministrativo } from '../../security/acesso-administrativo';
import { bloquearAcessoAdministrativo } from '../../security/transacao-administrativa';
import { RelogioSistema, type Relogio } from '../../security/relogio';
import type { MetadadosImagem } from '../../storage/armazenamento-imagens';
import type { ArquivoImagem, EstadoArquivo, RepositorioArquivosImagens } from '../contracts/repositorio-arquivos-imagens';
import { bancoAdministrativo } from './banco-administrativo';
export interface LinhaArquivo extends RowDataPacket { id: string; proprietario_id: string; chave_temporaria: string; chave_publica: string; estado: EstadoArquivo; versao_cloudinary: string | null; expira_em: Date; lease_id: string | null; lease_ate: Date | null; tentativas: number; }
export function arquivoDto(r: LinhaArquivo): ArquivoImagem { return { id: r.id, proprietarioId: r.proprietario_id, chaveTemporaria: r.chave_temporaria, chavePublica: r.chave_publica, estado: r.estado, version: r.versao_cloudinary, expiraEm: r.expira_em, leaseId: r.lease_id }; }
export async function possuiReferencia(c: PoolConnection, key: string): Promise<boolean> {
  const [rows] = await c.execute<RowDataPacket[]>({ sql: 'SELECT id FROM unidades WHERE chave_imagem=? UNION ALL SELECT id FROM imagens_salas WHERE chave_arquivo=? UNION ALL SELECT id FROM servicos_empresariais WHERE chave_imagem=? LIMIT 1', timeout: 2000 }, [key, key, key]); return rows.length > 0;
}
export class RepositorioArquivosImagensMysql implements RepositorioArquivosImagens, OnModuleDestroy {
  private readonly pool: Pool;
  constructor(config: DatabaseConfig, private readonly namespace: string, private readonly clock: Relogio = new RelogioSistema()) { this.pool = createPool(buildPoolOptions(config)); }
  async registrar(ator: AtorAdministrativo, dados: { bytes: number; largura: number; altura: number }): Promise<ArquivoImagem> {
    return bancoAdministrativo(this.pool, async c => { await c.beginTransaction(); try {
      const actor = await bloquearAcessoAdministrativo(c, ator, this.clock); const id = randomUUID(); const lease = randomUUID();
      const temp = this.namespace + '/temporarios/' + id; const key = this.namespace + '/catalogo/' + id; const expira = new Date(actor.agora.getTime() + 86400000);
      await c.execute({ sql: 'INSERT INTO arquivos_imagens(id,proprietario_id,operacao_id,chave_temporaria,chave_publica,tamanho_bytes,largura,altura,criado_em,expira_em,lease_id,lease_ate) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', timeout: 2000 }, [id, actor.id, randomUUID(), temp, key, dados.bytes, dados.largura, dados.altura, actor.agora, expira, lease, new Date(actor.agora.getTime() + 120000)]);
      await c.commit(); return { id, proprietarioId: actor.id, chaveTemporaria: temp, chavePublica: key, estado: 'preparando', version: null, expiraEm: expira, leaseId: lease };
    } catch (error: unknown) { await c.rollback(); throw error; } });
  }
  async obter(ids: readonly string[]): Promise<ArquivoImagem[]> { if (!ids.length) return []; return bancoAdministrativo(this.pool, async c => { const [rows] = await c.execute<LinhaArquivo[]>({ sql: `SELECT * FROM arquivos_imagens WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id`, timeout: 2000 }, [...ids]); return rows.map(arquivoDto); }); }
  async reivindicarPublicacao(ator: AtorAdministrativo, id: string): Promise<ArquivoImagem> {
    return bancoAdministrativo(this.pool, async c => { await c.beginTransaction(); try {
      const actor = await bloquearAcessoAdministrativo(c, ator, this.clock); const [rows] = await c.execute<LinhaArquivo[]>({ sql: 'SELECT * FROM arquivos_imagens WHERE id=? FOR UPDATE', timeout: 2000 }, [id]); const row = rows[0]; if (!row) throw new NotFoundException('Imagem não encontrada.');
      if (row.estado === 'vinculado') { await c.commit(); return arquivoDto(row); }
      if (row.proprietario_id !== actor.id || row.expira_em <= actor.agora || !['temporario','publicando','disponivel'].includes(row.estado)) throw new ConflictException('Imagem indisponível para este cadastro.');
      if (row.estado === 'disponivel') { await c.commit(); return arquivoDto(row); }
      if (row.lease_ate && row.lease_ate > actor.agora) throw new ConflictException('Imagem em processamento. Tente novamente.');
      const lease = randomUUID(); await c.execute({ sql: "UPDATE arquivos_imagens SET estado='publicando',lease_id=?,lease_ate=?,atualizado_em=? WHERE id=?", timeout: 2000 }, [lease, new Date(actor.agora.getTime() + 120000), actor.agora, id]);
      await c.commit(); return { ...arquivoDto(row), estado: 'publicando', leaseId: lease };
    } catch (error: unknown) { await c.rollback(); throw error; } });
  }
  async atualizar(id: string, lease: string, estado: 'temporario' | 'disponivel' | 'removido', meta?: MetadadosImagem): Promise<void> {
    return bancoAdministrativo(this.pool, async c => {
      const expected = estado === 'temporario' ? 'preparando' : estado === 'disponivel' ? 'publicando' : 'removendo';
      const [result] = await c.execute<ResultSetHeader>({ sql: `UPDATE arquivos_imagens SET estado=?,lease_id=NULL,lease_ate=NULL,erro_codigo=NULL,proxima_tentativa_em=NULL,atualizado_em=?,versao_cloudinary=COALESCE(?,versao_cloudinary) WHERE id=? AND lease_id=? AND estado=?`, timeout: 2000 }, [estado, this.clock.agora(), meta?.version ?? null, id, lease, expected]);
      if (result.affectedRows !== 1) throw new ConflictException('Processamento da imagem mudou. Atualize e tente novamente.');
    });
  }
  async falhou(id: string, lease: string): Promise<void> { return bancoAdministrativo(this.pool, async c => { await c.execute({ sql: "UPDATE arquivos_imagens SET lease_id=NULL,lease_ate=NULL,tentativas=LEAST(tentativas+1,65535),proxima_tentativa_em=DATE_ADD(?,INTERVAL LEAST(1440,5*POW(2,LEAST(tentativas,8))) MINUTE),erro_codigo='STORAGE_UNAVAILABLE',atualizado_em=? WHERE id=? AND lease_id=?", timeout: 2000 }, [this.clock.agora(), this.clock.agora(), id, lease]); }); }
  async reivindicarLimpeza(): Promise<ArquivoImagem | null> {
    return bancoAdministrativo(this.pool, async c => { await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'); await c.beginTransaction(); try {
      const now = this.clock.agora(); const grace = new Date(now.getTime() - 86400000);
      const [rows] = await c.execute<LinhaArquivo[]>({ sql: `SELECT * FROM arquivos_imagens WHERE (lease_ate IS NULL OR lease_ate<=?) AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em<=?) AND
        (estado='removendo' OR (estado IN ('preparando','temporario','publicando','disponivel') AND expira_em<=? AND atualizado_em<=?)) ORDER BY criado_em,id LIMIT 1 FOR UPDATE SKIP LOCKED`, timeout: 2000 }, [now, now, now, grace]);
      const row = rows[0]; if (!row) { await c.commit(); return null; }
      if (await possuiReferencia(c, row.chave_publica)) { await c.execute("UPDATE arquivos_imagens SET estado='vinculado',lease_id=NULL,lease_ate=NULL WHERE id=?", [row.id]); await c.commit(); return null; }
      const lease = randomUUID(); await c.execute({ sql: "UPDATE arquivos_imagens SET estado='removendo',lease_id=?,lease_ate=? WHERE id=?", timeout: 2000 }, [lease, new Date(now.getTime() + 120000), row.id]); await c.commit();
      return { ...arquivoDto(row), estado: 'removendo', leaseId: lease };
    } catch (error: unknown) { await c.rollback(); throw error; } });
  }
  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}
