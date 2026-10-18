import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import type { SessaoDto } from '../dto/sessao.dto';
import type { UsuarioPublicoDto } from '../dto/usuario-publico.dto';
import type { SessaoValida } from '../repositories/contracts/repositorio-sessoes';
import type { RepositorioAutenticacao } from '../repositories/contracts/repositorio-autenticacao';
import type { VerificadorSenha } from '../security/verificador-senha';
import { PoliticaSenha } from '../security/politica-senha';
import { ServicoSessoes, INATIVIDADE_MS } from './servico-sessoes';
function incorreta(): never { throw new UnauthorizedException('Senha incorreta'); }
function dto(user: UsuarioPublicoDto, session: SessaoValida): SessaoDto {
  return { user, idleExpiresAt: new Date(Math.min(session.ultimaAtividadeEm.getTime() + INATIVIDADE_MS, session.expiraEm.getTime())).toISOString(), absoluteExpiresAt: session.expiraEm.toISOString() };
}
export class ServicoAutenticacao {
  constructor(private readonly usuarios: RepositorioAutenticacao, private readonly senhas: VerificadorSenha, private readonly sessoes: ServicoSessoes, private readonly hashFicticio: string) {}
  async login(input: unknown, tokenAnterior: string | null): Promise<{ token: string; resposta: SessaoDto }> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) incorreta();
    const body: Record<string, unknown> = Object.fromEntries(Object.entries(input));
    if (Object.keys(body).some(key => key !== 'email' && key !== 'password') || typeof body.email !== 'string') incorreta();
    const email = body.email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.includes('..')) incorreta();
    let senha: string;
    try { senha = new PoliticaSenha().normalizar(body.password); }
    catch (error: unknown) { if (error instanceof BadRequestException) incorreta(); throw error; }
    const credentials = await this.usuarios.buscarCredenciais(email);
    const hash = credentials?.senhaHash ?? this.hashFicticio;
    const correct = await this.senhas.verificar(hash, senha);
    if (!correct || !credentials?.senhaHash || !credentials.usuario.active) incorreta();
    const created = await this.sessoes.criar(credentials.usuario.id, tokenAnterior, credentials.senhaHash);
    return { token: created.token, resposta: dto(credentials.usuario, created.sessao) };
  }
  private async usuario(session: SessaoValida, token: string | null): Promise<UsuarioPublicoDto | null> {
    const user = await this.usuarios.buscarPublico(session.usuarioId);
    if (!user?.active) { await this.sessoes.revogar(token); return null; }
    return user;
  }
  async consultar(token: string | null): Promise<SessaoDto | null> {
    const session = await this.sessoes.consultar(token);
    if (!session) return null;
    const user = await this.usuario(session, token);
    return user ? dto(user, session) : null;
  }
  async atividade(token: string | null): Promise<SessaoDto | null> {
    const current = await this.sessoes.consultar(token);
    if (!current) return null;
    const user = await this.usuario(current, token);
    if (!user) return null;
    const touched = await this.sessoes.registrarAtividade(token);
    return touched ? dto(user, touched) : null;
  }
  async logout(token: string | null): Promise<void> { await this.sessoes.revogar(token); }
}
