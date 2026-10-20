import type { OnModuleDestroy } from '@nestjs/common';
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import type { DatabaseConfig } from '../../config/environment';
import { buildPoolOptions } from '../../database/database.service';
import { comConexaoLimitada } from '../../database/conexao-limitada';
import type { UnidadeDto } from '../../dto/unidade.dto';
import type { RepositorioUnidades } from '../contracts/repositorio-unidades';
import type { ArmazenamentoImagens } from '../../storage/armazenamento-imagens';
import { resolverImagens } from './resolver-imagens';
interface LinhaUnidade extends RowDataPacket {
  id: string; nome: string; endereco: string; descricao: string | null; chave_imagem: string | null;
  latitude: string | null; longitude: string | null; total_salas: number | string;
}
export class RepositorioUnidadesMysql implements RepositorioUnidades, OnModuleDestroy {
  private readonly pool: Pool;
  constructor(config: DatabaseConfig, private readonly storage?: ArmazenamentoImagens) { this.pool = createPool(buildPoolOptions(config)); }
  async listar(): Promise<UnidadeDto[]> {
    return comConexaoLimitada(() => this.pool.getConnection(), async connection => {
      // Contagem de salas cadastradas, não disponibilidade por período. Nenhum valor vem de HTTP.
      const [rows] = await connection.execute<LinhaUnidade[]>({ sql: `SELECT u.id, u.nome, u.endereco, u.descricao, u.chave_imagem, u.latitude, u.longitude,
        COUNT(s.id) AS total_salas FROM unidades u LEFT JOIN salas s ON s.unidade_id = u.id
        GROUP BY u.id ORDER BY u.nome, u.id`, timeout: 2000 });
      const images = this.storage ? await resolverImagens(connection, rows.flatMap(r => r.chave_imagem ? [r.chave_imagem] : []), this.storage) : new Map<string, { cardUrl: string }>();
      return rows.map(row => {
        const count = Number(row.total_salas);
        if (!Number.isSafeInteger(count) || count < 0) throw new Error('Contagem inválida.');
        const unit: UnidadeDto = { id: row.id, name: row.nome, address: row.endereco, availableRooms: count,
          imageUrl: row.chave_imagem ? images.get(row.chave_imagem)?.cardUrl ?? (/^(https:\/\/|\/(?!\/))/.test(row.chave_imagem) ? row.chave_imagem : null) : null,
          ...(row.descricao !== null ? { description: row.descricao } : {}) };
        if (row.latitude !== null || row.longitude !== null) {
          const latitude = Number(row.latitude); const longitude = Number(row.longitude);
          if (row.latitude === null || row.longitude === null || !Number.isFinite(latitude) || Math.abs(latitude) > 90
            || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new Error('Coordenadas inválidas.');
          unit.latitude = latitude; unit.longitude = longitude;
        }
        return unit;
      });
    });
  }
  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}
