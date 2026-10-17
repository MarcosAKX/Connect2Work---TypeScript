import { comConexaoLimitada } from '../../database/conexao-limitada';
import { ServiceUnavailableException, type OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createPool, type Pool, type PoolConnection, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import type { DatabaseConfig } from '../../config/environment';
import { buildPoolOptions } from '../../database/database.service';
import type { RepositorioSessoes, SessaoValida } from '../contracts/repositorio-sessoes';
import { INATIVIDADE_MS } from '../../services/servico-sessoes';
interface LinhaSessao extends RowDataPacket { usuario_id: string; ultima_atividade_em: Date; expira_em: Date; }
// Os mesmos predicados são usados na consulta e no UPDATE atômico.
// Revogação concorrente serializa na linha; nenhum UPDATE remove revogado_em.
const VALIDA = 'token_hash = ? AND revogado_em IS NULL AND expira_em > ? AND ultima_atividade_em > ? AND ultima_atividade_em <= ?';
function parametros(hash: Buffer, agora: Date) { return [hash, agora, new Date(agora.getTime() - INATIVIDADE_MS), agora]; }
function publica(row: LinhaSessao | undefined): SessaoValida | null {
  return row ? { usuarioId: row.usuario_id, ultimaAtividadeEm: row.ultima_atividade_em, expiraEm: row.expira_em } : null;
}
export class RepositorioSessoesMysql implements RepositorioSessoes, OnModuleDestroy {
  private readonly pool: Pool;
  constructor(config: DatabaseConfig) { this.pool = createPool(buildPoolOptions(config)); }
  private async executar<T>(operation: (connection: PoolConnection) => Promise<T>): Promise<T> {
    try {
      return await comConexaoLimitada(() => this.pool.getConnection(), async connection => {
        await connection.execute({ sql: "SET time_zone = '+00:00'", timeout: 2000 });
        return operation(connection);
      });
    } catch { throw new ServiceUnavailableException('Não foi possível verificar a sessão. Tente novamente.'); }
  }
  async criar(usuarioId: string, hash: Buffer, agora: Date, expiraEm: Date, anterior: Buffer | null): Promise<void> {
    await this.executar(async connection => {
      await connection.beginTransaction();
      try {
        if (anterior) await connection.execute({ sql: 'UPDATE sessoes SET revogado_em = GREATEST(criado_em, ?) WHERE token_hash = ? AND revogado_em IS NULL', timeout: 2000 }, [agora, anterior]);
        await connection.execute({ sql: 'INSERT INTO sessoes (id, usuario_id, token_hash, criado_em, ultima_atividade_em, expira_em) VALUES (?, ?, ?, ?, ?, ?)', timeout: 2000 }, [randomUUID(), usuarioId, hash, agora, agora, expiraEm]);
        await connection.commit();
      } catch (error: unknown) { await connection.rollback(); throw error; }
    });
  }
  async consultar(hash: Buffer, agora: Date): Promise<SessaoValida | null> {
    return this.executar(async connection => {
      const [rows] = await connection.execute<LinhaSessao[]>({ sql: 'SELECT usuario_id, ultima_atividade_em, expira_em FROM sessoes WHERE ' + VALIDA, timeout: 2000 }, parametros(hash, agora));
      return publica(rows[0]);
    });
  }
  async registrarAtividade(hash: Buffer, agora: Date): Promise<SessaoValida | null> {
    return this.executar(async connection => {
      await connection.beginTransaction();
      try {
        const [result] = await connection.execute<ResultSetHeader>({ sql: 'UPDATE sessoes SET ultima_atividade_em = ? WHERE ' + VALIDA, timeout: 2000 }, [agora, ...parametros(hash, agora)]);
        const [rows] = result.affectedRows === 1
          ? await connection.execute<LinhaSessao[]>({ sql: 'SELECT usuario_id, ultima_atividade_em, expira_em FROM sessoes WHERE ' + VALIDA, timeout: 2000 }, parametros(hash, agora))
          : [[]];
        const session = publica(rows[0]);
        await connection.commit();
        return session;
      } catch (error: unknown) { await connection.rollback(); throw error; }
    });
  }
  async revogar(hash: Buffer, agora: Date): Promise<void> {
    await this.executar(async connection => { await connection.execute({ sql: 'UPDATE sessoes SET revogado_em = GREATEST(criado_em, ?) WHERE token_hash = ? AND revogado_em IS NULL', timeout: 2000 }, [agora, hash]); });
  }
  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}
