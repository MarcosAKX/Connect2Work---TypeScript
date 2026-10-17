import { ConflictException, ServiceUnavailableException, type OnModuleDestroy } from '@nestjs/common';
import { createPool, type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import type { DatabaseConfig } from '../../config/environment';
import { buildPoolOptions } from '../../database/database.service';
import { comConexaoLimitada } from '../../database/conexao-limitada';
import type { NovoUsuario, RepositorioUsuarios } from '../contracts/repositorio-usuarios';
import type { RepositorioAutenticacao } from '../contracts/repositorio-autenticacao';
import type { UsuarioPublicoDto } from '../../dto/usuario-publico.dto';
interface LinhaUsuario extends RowDataPacket {
  id: string; nome: string; email: string; profissao: string | null; telefone: string | null; ativo: number;
  criado_em: Date; senha_hash: string | null; codigo: string; plano_ativo: number; saldo: string;
}
export class RepositorioUsuariosMysql implements RepositorioUsuarios, RepositorioAutenticacao, OnModuleDestroy {
  private readonly pool: Pool;
  constructor(config: DatabaseConfig) { this.pool = createPool(buildPoolOptions(config)); }
  async criar(user: NovoUsuario): Promise<void> {
    try {
      await comConexaoLimitada(() => this.pool.getConnection(), async connection => {
        await connection.execute({ sql: "SET time_zone = '+00:00'", timeout: 2000 });
        const [result] = await connection.execute<ResultSetHeader>({ sql: `INSERT INTO usuarios (id, perfil_id, nome, email, profissao, telefone, senha_hash, ativo, criado_em, atualizado_em)
          SELECT ?, id, ?, ?, ?, ?, ?, 1, ?, ? FROM perfis WHERE codigo = 'client'`, timeout: 2000 },
          [user.id, user.name, user.email, user.profession, user.phone, user.senhaHash, new Date(user.createdAt), new Date(user.createdAt)]);
        if (result.affectedRows !== 1) throw new Error('Perfil indisponível');
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') throw new ConflictException('Nao foi possivel cadastrar com esse e-mail.');
      throw new ServiceUnavailableException('Nao foi possivel criar sua conta. Tente novamente.');
    }
  }
  private async buscar(campo: 'email' | 'id', valor: string): Promise<{ usuario: UsuarioPublicoDto; senhaHash: string | null } | null> {
    try {
      return await comConexaoLimitada(() => this.pool.getConnection(), async connection => {
        await connection.execute({ sql: "SET time_zone = '+00:00'", timeout: 2000 });
        // Campo é união interna fechada; valores externos são sempre parâmetros.
        const [rows] = await connection.execute<LinhaUsuario[]>({ sql: `SELECT u.id, u.nome, u.email, u.profissao, u.telefone, u.ativo, u.criado_em, u.senha_hash, p.codigo,
          COALESCE(h.ativo, 0) AS plano_ativo, COALESCE(h.saldo, 0) AS saldo
          FROM usuarios u JOIN perfis p ON p.id = u.perfil_id LEFT JOIN planos_horas h ON h.usuario_id = u.id WHERE u.${campo} = ?`, timeout: 2000 }, [valor]);
        const row = rows[0];
        if (!row) return null;
        if (row.codigo !== 'client' && row.codigo !== 'admin' && row.codigo !== 'secretaria') throw new Error('Perfil inválido');
        const balance = Number(row.saldo);
        if (!Number.isFinite(balance) || balance < 0) throw new Error('Saldo inválido');
        const usuario: UsuarioPublicoDto = {
          id: row.id, name: row.nome, email: row.email, profession: row.profissao ?? '', phone: row.telefone ?? '',
          role: row.codigo, active: row.ativo === 1, createdAt: row.criado_em.toISOString(),
          hasHoursPlan: row.plano_ativo === 1, hoursBalance: balance
        };
        return { usuario, senhaHash: row.senha_hash };
      });
    } catch { throw new ServiceUnavailableException('Não foi possível consultar a conta. Tente novamente.'); }
  }
  async buscarCredenciais(email: string): Promise<{ usuario: UsuarioPublicoDto; senhaHash: string | null } | null> { return this.buscar('email', email); }
  async buscarPublico(id: string): Promise<UsuarioPublicoDto | null> { return (await this.buscar('id', id))?.usuario ?? null; }
  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}
