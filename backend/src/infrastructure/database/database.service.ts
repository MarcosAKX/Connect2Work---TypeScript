import type { OnModuleDestroy } from '@nestjs/common';
import { createPool, type PoolOptions } from 'mysql2/promise';
import type { DatabaseConfig } from '../../config/environment';

export interface Readiness { isReady(): Promise<boolean>; }
export interface DatabaseConnection { execute(sql: string): Promise<void>; release(): void; }
export interface DatabasePool { getConnection(): Promise<DatabaseConnection>; end(): Promise<void>; }
export function buildPoolOptions(config: DatabaseConfig): PoolOptions {
  return {
    host: config.host, port: config.port, database: config.database,
    user: config.user, password: config.password,
    connectionLimit: 5, queueLimit: 10, waitForConnections: true,
    connectTimeout: 3000, timezone: 'Z', charset: 'utf8mb4',
    decimalNumbers: false, supportBigNumbers: true, bigNumberStrings: true,
    multipleStatements: false, enableKeepAlive: true
  };
}
export function createDatabasePool(config: DatabaseConfig): DatabasePool {
  const pool = createPool(buildPoolOptions(config));
  return {
    async getConnection() {
      const connection = await pool.getConnection();
      return {
        async execute(sql: string) { await connection.execute({ sql, timeout: 2000 }); },
        release() { connection.release(); }
      };
    },
    async end() { await pool.end(); }
  };
}
// Encapsula a infraestrutura; nenhum SQL é recebido de requisições HTTP.
export class DatabaseService implements Readiness, OnModuleDestroy {
  constructor(private readonly pool: DatabasePool) {}
  async isReady(): Promise<boolean> {
    let connection: DatabaseConnection | undefined;
    try {
      connection = await this.pool.getConnection();
      await connection.execute("SET time_zone = '+00:00'");
      await connection.execute('SELECT 1');
      return true;
    } catch { return false; }
    finally { connection?.release(); }
  }
  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}