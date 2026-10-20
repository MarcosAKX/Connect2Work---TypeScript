import { ConflictException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { comConexaoLimitada } from '../../database/conexao-limitada';
export async function bancoAdministrativo<T>(pool: Pool, fn: (c: PoolConnection) => Promise<T>): Promise<T> {
  try { return await comConexaoLimitada(() => pool.getConnection(), async c => { await c.execute({ sql: "SET time_zone = '+00:00'", timeout: 2000 }); return fn(c); }); }
  catch (error: unknown) {
    if (error instanceof HttpException) throw error;
    if (error && typeof error === 'object' && 'code' in error && ['ER_DUP_ENTRY','ER_ROW_IS_REFERENCED_2','ER_NO_REFERENCED_ROW_2','ER_LOCK_DEADLOCK'].includes(String(error.code))) throw new ConflictException('Não foi possível salvar por conflito ou vínculo existente. Atualize a lista.');
    throw new ServiceUnavailableException('Não foi possível concluir a operação. Tente novamente.');
  }
}
