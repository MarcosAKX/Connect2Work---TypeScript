import type { RepositorioSessoes, SessaoValida } from '../repositories/contracts/repositorio-sessoes';
import { RelogioSistema, type Relogio } from '../security/relogio';
import { TokenSessao } from '../security/token-sessao';
export const INATIVIDADE_MS = 15 * 60 * 1000;
export const DURACAO_MAXIMA_MS = 4 * 60 * 60 * 1000;
export class ServicoSessoes {
  constructor(private readonly repositorio: RepositorioSessoes, private readonly relogio: Relogio = new RelogioSistema(), private readonly tokens = new TokenSessao()) {}
  async criar(usuarioId: string, tokenAnterior: string | null, senhaHashEsperada?: string): Promise<{ token: string; sessao: SessaoValida }> {
    const agora = this.relogio.agora();
    const expiraEm = new Date(agora.getTime() + DURACAO_MAXIMA_MS);
    const { token, hash } = this.tokens.gerar();
    await this.repositorio.criar(usuarioId, hash, agora, expiraEm, tokenAnterior ? this.tokens.hash(tokenAnterior) : null, senhaHashEsperada);
    return { token, sessao: { usuarioId, ultimaAtividadeEm: agora, expiraEm } };
  }
  async consultar(token: string | null): Promise<SessaoValida | null> {
    const hash = token ? this.tokens.hash(token) : null;
    return hash ? this.repositorio.consultar(hash, this.relogio.agora()) : null;
  }
  async registrarAtividade(token: string | null): Promise<SessaoValida | null> {
    const hash = token ? this.tokens.hash(token) : null;
    return hash ? this.repositorio.registrarAtividade(hash, this.relogio.agora()) : null;
  }
  async revogar(token: string | null): Promise<void> {
    const hash = token ? this.tokens.hash(token) : null;
    if (hash) await this.repositorio.revogar(hash, this.relogio.agora());
  }
}
