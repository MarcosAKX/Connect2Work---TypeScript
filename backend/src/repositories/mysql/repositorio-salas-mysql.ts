import type { OnModuleDestroy } from '@nestjs/common';
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import type { DatabaseConfig } from '../../config/environment';
import { buildPoolOptions } from '../../database/database.service';
import { comConexaoLimitada } from '../../database/conexao-limitada';
import type { SalaDto } from '../../dto/sala.dto';
import type { RepositorioSalas } from '../contracts/repositorio-salas';
interface LinhaSala extends RowDataPacket {
  id: string; unidade_id: string; nome: string; capacidade: number; preco_por_hora: string; comodidade: string | null;
}
export class RepositorioSalasMysql implements RepositorioSalas, OnModuleDestroy {
  private readonly pool: Pool;
  constructor(config: DatabaseConfig) { this.pool = createPool(buildPoolOptions(config)); }
  private async consultar(campo: 's.unidade_id' | 's.id', id: string): Promise<SalaDto[]> {
    return comConexaoLimitada(() => this.pool.getConnection(), async connection => {
      // Campo é uma união interna fechada; o identificador recebido é sempre parâmetro SQL.
      // LEFT JOIN preserva salas sem comodidades; agrupamento em memória evita truncamento de GROUP_CONCAT.
      const [rows] = await connection.execute<LinhaSala[]>({ sql: `SELECT s.id, s.unidade_id, s.nome, s.capacidade, s.preco_por_hora, c.nome AS comodidade
        FROM salas s LEFT JOIN sala_comodidades sc ON sc.sala_id = s.id LEFT JOIN comodidades c ON c.id = sc.comodidade_id
        WHERE ${campo} = ? ORDER BY s.nome, s.id, c.nome, c.id`, timeout: 2000 }, [id]);
      const rooms = new Map<string, SalaDto>();
      for (const row of rows) {
        let room = rooms.get(row.id);
        if (!room) {
          const price = Number(row.preco_por_hora);
          if (!Number.isFinite(price) || price < 0 || !Number.isSafeInteger(row.capacidade) || row.capacidade <= 0) throw new Error('Dados de sala inválidos.');
          room = { id: row.id, unitId: row.unidade_id, name: row.nome, capacity: row.capacidade, pricePerHour: price, amenities: [], imageUrl: null };
          rooms.set(row.id, room);
        }
        if (row.comodidade !== null && !room.amenities.includes(row.comodidade)) room.amenities.push(row.comodidade);
      }
      return [...rooms.values()];
    });
  }
  async listarPorUnidade(id: string): Promise<SalaDto[]> { return this.consultar('s.unidade_id', id); }
  async buscarPorId(id: string): Promise<SalaDto | null> { return (await this.consultar('s.id', id))[0] ?? null; }
  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}
