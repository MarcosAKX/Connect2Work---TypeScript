import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ServicoAutenticacao } from '../services/servico-autenticacao';
import type { Papel } from '../dto/usuario-gerenciado.dto';
import { TokenSessao } from './token-sessao';
export interface AtorAdministrativo { id: string; name: string; role: Papel; tokenHash: Buffer; }
export class AcessoAdministrativo {
  constructor(private readonly auth: Pick<ServicoAutenticacao, 'consultar'>) {}
  async exigir(token: string | null, papeis: readonly Papel[] = ['admin']): Promise<AtorAdministrativo> {
    const hash = token ? new TokenSessao().hash(token) : null;
    if (!hash) throw new UnauthorizedException('Sessão encerrada. Faça login novamente.');
    const session = await this.auth.consultar(token);
    if (!session?.user.active) throw new UnauthorizedException('Sessão encerrada. Faça login novamente.');
    if (!papeis.includes(session.user.role)) throw new ForbiddenException('Acesso não permitido.');
    return { id: session.user.id, name: session.user.name, role: session.user.role, tokenHash: hash };
  }
}
