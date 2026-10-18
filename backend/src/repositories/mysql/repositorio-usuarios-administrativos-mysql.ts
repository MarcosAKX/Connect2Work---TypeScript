import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, HttpException, NotFoundException, ServiceUnavailableException, UnauthorizedException, type OnModuleDestroy } from '@nestjs/common';
import { createPool, type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import type { DatabaseConfig } from '../../config/environment';
import { buildPoolOptions } from '../../database/database.service';
import { comConexaoLimitada } from '../../database/conexao-limitada';
import type { ConsultaUsuarios, DadosUsuario, PaginaUsuarios, Papel, ResumoUsuarios, UsuarioGerenciadoDto } from '../../dto/usuario-gerenciado.dto';
import type { AtorAdministrativo } from '../../security/acesso-administrativo';
import { RelogioSistema, type Relogio } from '../../security/relogio';
import { INATIVIDADE_MS } from '../../services/servico-sessoes';
import type { OperacaoUsuario, RepositorioUsuariosAdministrativos } from '../contracts/repositorio-usuarios-administrativos';
interface LinhaUsuario extends RowDataPacket { id: string; nome: string; email: string; profissao: string | null; telefone: string | null; codigo: string; ativo: number; criado_em: Date; atualizado_em: Date; versao: string; plano_ativo: number; saldo: string; }
const COLUNAS = `u.id,u.nome,u.email,u.profissao,u.telefone,u.ativo,u.criado_em,u.atualizado_em,p.codigo,
  DATE_FORMAT(u.atualizado_em,'%Y-%m-%d %H:%i:%s.%f') AS versao,COALESCE(h.ativo,0) AS plano_ativo,COALESCE(h.saldo,0) AS saldo`;
const ORIGEM = ' FROM usuarios u JOIN perfis p ON p.id=u.perfil_id LEFT JOIN planos_horas h ON h.usuario_id=u.id ';
function dto(row: LinhaUsuario): UsuarioGerenciadoDto {
  const role = row.codigo; if (role !== 'admin' && role !== 'client' && role !== 'secretaria') throw new Error('Perfil inválido');
  const balance = Number(row.saldo); if (!Number.isFinite(balance) || balance < 0) throw new Error('Saldo inválido');
  return { id: row.id, name: row.nome, email: row.email, profession: row.profissao ?? '', phone: row.telefone ?? '', role, active: row.ativo === 1,
    createdAt: row.criado_em.toISOString(), updatedAt: row.atualizado_em.toISOString(), version: row.versao, hasHoursPlan: row.plano_ativo === 1, hoursBalance: balance };
}
export class RepositorioUsuariosAdministrativosMysql implements RepositorioUsuariosAdministrativos, OnModuleDestroy {
  private readonly pool: Pool;
  constructor(config: DatabaseConfig, private readonly relogio: Relogio = new RelogioSistema(), private readonly novoIdAuditoria: () => string = randomUUID) { this.pool = createPool(buildPoolOptions(config)); }
  private async usar<T>(fn: (c: PoolConnection) => Promise<T>): Promise<T> {
    try { return await comConexaoLimitada(() => this.pool.getConnection(), async c => { await c.execute({ sql: "SET time_zone = '+00:00'", timeout: 2000 }); return fn(c); }); }
    catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') throw new ConflictException('Não foi possível salvar. Confira o e-mail e atualize a lista.');
      throw new ServiceUnavailableException('Não foi possível concluir a operação. Tente novamente.');
    }
  }
  async listar(q: ConsultaUsuarios): Promise<PaginaUsuarios> {
    return this.usar(async c => {
      await c.query({ sql: 'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ', timeout: 2000 }); await c.beginTransaction();
      try {
        const where = ['LOCATE(?,CONCAT(u.nome,\' \',u.email))>0']; const params: (string | number | boolean)[] = [q.search];
        if (q.role !== undefined) { where.push('p.codigo=?'); params.push(q.role); }
        if (q.active !== undefined) { where.push('u.ativo=?'); params.push(q.active); }
        interface Contagem extends RowDataPacket { total: number; }
        interface Resumo extends RowDataPacket { total: number; active: number; inactive: number; admin: number; client: number; secretaria: number; }
        const [count] = await c.execute<Contagem[]>({ sql: 'SELECT COUNT(*) total' + ORIGEM + 'WHERE ' + where.join(' AND '), timeout: 2000 }, params);
        const [summaryRows] = await c.execute<Resumo[]>({ sql: `SELECT COUNT(*) total,COALESCE(SUM(u.ativo=1),0) active,COALESCE(SUM(u.ativo=0),0) inactive,
          COALESCE(SUM(p.codigo='admin'),0) admin,COALESCE(SUM(p.codigo='client'),0) client,COALESCE(SUM(p.codigo='secretaria'),0) secretaria FROM usuarios u JOIN perfis p ON p.id=u.perfil_id`, timeout: 2000 });
        const [rows] = await c.execute<LinhaUsuario[]>({ sql: 'SELECT ' + COLUNAS + ORIGEM + 'WHERE ' + where.join(' AND ') + ` ORDER BY u.nome,u.id LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`, timeout: 2000 }, params);
        const s = summaryRows[0]; if (!s) throw new Error('Resumo ausente');
        const summary: ResumoUsuarios = { total: Number(s.total), active: Number(s.active), inactive: Number(s.inactive), admin: Number(s.admin), client: Number(s.client), secretaria: Number(s.secretaria) };
        await c.commit(); return { items: rows.map(dto), total: Number(count[0]?.total ?? 0), page: q.page, pageSize: q.pageSize, summary };
      } catch (error: unknown) { await c.rollback(); throw error; }
    });
  }
  async equipe(): Promise<{ id: string; name: string }[]> {
    return this.usar(async c => { const [rows] = await c.execute<LinhaUsuario[]>({ sql: "SELECT u.id,u.nome FROM usuarios u JOIN perfis p ON p.id=u.perfil_id WHERE u.ativo=1 AND p.codigo IN ('admin','secretaria') ORDER BY u.nome,u.id LIMIT 100", timeout: 2000 }); return rows.map(r => ({ id: r.id, name: r.nome })); });
  }
  async clientes(search: string): Promise<{ id: string; name: string; email: string }[]> {
    return this.usar(async c => { const [rows] = await c.execute<LinhaUsuario[]>({ sql: "SELECT u.id,u.nome,u.email FROM usuarios u JOIN perfis p ON p.id=u.perfil_id WHERE u.ativo=1 AND p.codigo='client' AND LOCATE(?,CONCAT(u.nome,' ',u.email))>0 ORDER BY u.nome,u.id LIMIT 20", timeout: 2000 }, [search]); return rows.map(r => ({ id: r.id, name: r.nome, email: r.email })); });
  }
  private async buscar(c: PoolConnection, id: string): Promise<UsuarioGerenciadoDto> {
    const [rows] = await c.execute<LinhaUsuario[]>({ sql: 'SELECT ' + COLUNAS + ORIGEM + 'WHERE u.id=?', timeout: 2000 }, [id]); const row = rows[0]; if (!row) throw new NotFoundException('Usuário não encontrado.'); return dto(row);
  }
  async gravar(ator: AtorAdministrativo, op: OperacaoUsuario): Promise<UsuarioGerenciadoDto> {
    return this.usar(async c => {
      await c.query({ sql: 'SET TRANSACTION ISOLATION LEVEL READ COMMITTED', timeout: 2000 }); await c.beginTransaction();
      try {
        // Linha estável serializa mudanças administrativas, inclusive proteção do último admin.
        const [perfis] = await c.execute<RowDataPacket[]>({ sql: "SELECT id FROM perfis WHERE codigo='admin' FOR UPDATE", timeout: 2000 }); if (!perfis.length) throw new Error('Perfil ausente');
        const [locked] = await c.execute<LinhaUsuario[]>({ sql: 'SELECT id,nome,ativo,perfil_id FROM usuarios WHERE id IN (?,?) ORDER BY id FOR UPDATE', timeout: 2000 }, [ator.id, op.id]);
        const actorRow = locked.find(r => r.id === ator.id); if (!actorRow || actorRow.ativo !== 1) throw new UnauthorizedException('Sessão encerrada. Faça login novamente.');
        const actor = await this.buscar(c, ator.id); if (actor.role !== 'admin') throw new ForbiddenException('Acesso não permitido.');
        const [sessions] = await c.execute<RowDataPacket[]>({ sql: 'SELECT criado_em,ultima_atividade_em,expira_em,revogado_em FROM sessoes WHERE token_hash=? AND usuario_id=? FOR UPDATE', timeout: 2000 }, [ator.tokenHash, ator.id]);
        const session = sessions[0]; const now = this.relogio.agora();
        if (!session || session.revogado_em !== null || !(session.expira_em instanceof Date) || session.expira_em <= now || !(session.ultima_atividade_em instanceof Date) || session.ultima_atividade_em.getTime() <= now.getTime() - INATIVIDADE_MS || session.ultima_atividade_em > now) throw new UnauthorizedException('Sessão encerrada. Faça login novamente.');
        let previous: UsuarioGerenciadoDto | null = null;
        if (op.kind !== 'create') {
          previous = await this.buscar(c, op.id);
          if (previous.version !== op.expectedVersion) throw new ConflictException('Este usuário foi alterado. Recarregue a lista antes de editar.');
        }
        const nextRole: Papel = op.kind === 'create' || op.kind === 'update' ? op.data.role : op.kind === 'role' ? op.role : previous?.role ?? 'client';
        const nextActive = op.kind === 'create' || op.kind === 'update' ? op.data.active : op.kind === 'status' ? op.active : previous?.active ?? false;
        if (ator.id === op.id && (nextRole !== 'admin' || !nextActive)) throw new ConflictException('Sua própria conta administrativa está protegida.');
        if (previous?.active && previous.role === 'admin' && (!nextActive || nextRole !== 'admin')) {
          const [admins] = await c.execute<RowDataPacket[]>({ sql: "SELECT u.id FROM usuarios u JOIN perfis p ON p.id=u.perfil_id WHERE p.codigo='admin' AND u.ativo=1", timeout: 2000 });
          if (admins.length <= 1) throw new ConflictException('Mantenha pelo menos um administrador ativo.');
        }
        const [roles] = await c.execute<RowDataPacket[]>({ sql: 'SELECT id FROM perfis WHERE codigo=?', timeout: 2000 }, [nextRole]); const roleId: unknown = roles[0]?.id; if (typeof roleId !== 'number') throw new Error('Perfil ausente');
        if (op.kind === 'create') {
          if (!op.data.senhaHash) throw new Error('Hash ausente');
          await c.execute({ sql: 'INSERT INTO usuarios(id,perfil_id,nome,email,profissao,telefone,senha_hash,ativo,criado_em,atualizado_em) VALUES(?,?,?,?,?,?,?,?,?,?)', timeout: 2000 }, [op.id, roleId, op.data.name, op.data.email, op.data.profession || null, op.data.phone || null, op.data.senhaHash, nextActive, now, now]);
        } else {
          const data: DadosUsuario = op.kind === 'update' ? op.data : { name: previous?.name ?? '', email: previous?.email ?? '', profession: previous?.profession ?? '', phone: previous?.phone ?? '', role: nextRole, active: nextActive };
          await c.execute({ sql: `UPDATE usuarios SET perfil_id=?,nome=?,email=?,profissao=?,telefone=?,ativo=?,${data.senhaHash ? 'senha_hash=?,' : ''}
            atualizado_em=GREATEST(?,DATE_ADD(atualizado_em,INTERVAL 1 MICROSECOND)) WHERE id=?`, timeout: 2000 }, [roleId, data.name, data.email, data.profession || null, data.phone || null, nextActive, ...(data.senhaHash ? [data.senhaHash] : []), now, op.id]);
          if (data.senhaHash || previous?.role !== nextRole || !nextActive) await c.execute({ sql: 'UPDATE sessoes SET revogado_em=GREATEST(criado_em,?) WHERE usuario_id=? AND revogado_em IS NULL', timeout: 2000 }, [now, op.id]);
        }
        await c.execute({ sql: 'INSERT INTO registros_auditoria(id,usuario_id,nome_usuario,acao,entidade,entidade_id,detalhes,ocorrido_em) VALUES(?,?,?,?,?,?,?,?)', timeout: 2000 },
          [this.novoIdAuditoria(), actor.id, actor.name, op.kind === 'create' ? 'create' : 'update', 'user', op.id, JSON.stringify({ role: nextRole, active: nextActive, passwordChanged: (op.kind === 'create' || op.kind === 'update') && Boolean(op.data.senhaHash), source: 'administracao' }), now]);
        const result = await this.buscar(c, op.id); await c.commit(); return result;
      } catch (error: unknown) { await c.rollback(); throw error; }
    });
  }
  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}
