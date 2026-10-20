import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { AtorAdministrativo } from './acesso-administrativo';
import { INATIVIDADE_MS } from '../services/servico-sessoes';
import type { Relogio } from './relogio';
// Ordem compartilhada com a gestão de contas: perfil estável → usuários ordenados → sessão.
export async function bloquearAcessoAdministrativo(c: PoolConnection, ator: AtorAdministrativo, relogio: Relogio, alvos: readonly string[] = []): Promise<{ id: string; name: string; agora: Date }> {
  await c.execute({ sql: "SELECT id FROM perfis WHERE codigo='admin' FOR UPDATE", timeout: 2000 });
  const ids = [...new Set([ator.id, ...alvos])].sort();
  const [users] = await c.execute<RowDataPacket[]>({ sql: `SELECT id,nome,ativo,perfil_id FROM usuarios WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id FOR UPDATE`, timeout: 2000 }, ids);
  const user = users.find(row => row.id === ator.id); if (!user || user.ativo !== 1) throw new UnauthorizedException('Sessão encerrada. Faça login novamente.');
  const [roles] = await c.execute<RowDataPacket[]>({ sql: 'SELECT codigo FROM perfis WHERE id=?', timeout: 2000 }, [user.perfil_id]);
  if (roles[0]?.codigo !== 'admin') throw new ForbiddenException('Acesso não permitido.');
  const [sessions] = await c.execute<RowDataPacket[]>({ sql: 'SELECT criado_em,ultima_atividade_em,expira_em,revogado_em FROM sessoes WHERE token_hash=? AND usuario_id=? FOR UPDATE', timeout: 2000 }, [ator.tokenHash, ator.id]);
  const session = sessions[0]; const agora = relogio.agora();
  if (!session || session.revogado_em !== null || !(session.expira_em instanceof Date) || session.expira_em <= agora || !(session.ultima_atividade_em instanceof Date) || session.ultima_atividade_em.getTime() <= agora.getTime() - INATIVIDADE_MS || session.ultima_atividade_em > agora) throw new UnauthorizedException('Sessão encerrada. Faça login novamente.');
  if (typeof user.nome !== 'string') throw new Error('Nome inválido');
  return { id: ator.id, name: user.nome, agora };
}
