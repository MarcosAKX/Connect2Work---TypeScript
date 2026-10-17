import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, BadRequestException, HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ServicoAutenticacao } from '../services/servico-autenticacao';
import { CookieSessao, type CabecalhosRequest, type RespostaCookie } from '../security/cookie-sessao';
import { LimiteAutenticacao } from '../security/limite-autenticacao';
export const AUTENTICACAO = Symbol('AUTENTICACAO');
export const COOKIE_SESSAO = Symbol('COOKIE_SESSAO');
interface RequestLogin extends CabecalhosRequest { socket: { remoteAddress?: string }; }
function corpoVazio(body: unknown): void {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length) throw new BadRequestException('Dados inválidos.');
}
@Controller('auth')
export class AutenticacaoController {
  private readonly limite = new LimiteAutenticacao();
  constructor(@Inject(AUTENTICACAO) private readonly auth: ServicoAutenticacao, @Inject(COOKIE_SESSAO) private readonly cookies: CookieSessao) {}
  private async executar<T>(action: () => Promise<T>): Promise<T> {
    try { return await action(); }
    catch (error: unknown) { if (error instanceof HttpException) throw error; throw new ServiceUnavailableException('Serviço indisponível. Tente novamente.'); }
  }
  @Post('login') @HttpCode(200)
  async login(@Body() body: unknown, @Req() request: RequestLogin, @Res({ passthrough: true }) response: RespostaCookie) {
    return this.executar(async () => {
      this.limite.consumir(request.socket.remoteAddress ?? 'local');
      const result = await this.auth.login(body, this.cookies.ler(request));
      this.cookies.definir(response, result.token);
      return result.resposta;
    });
  }
  @Get('session')
  async session(@Req() request: CabecalhosRequest, @Res({ passthrough: true }) response: RespostaCookie) {
    return this.executar(async () => {
      const session = await this.auth.consultar(this.cookies.ler(request));
      if (!session) { this.cookies.limpar(response); throw new UnauthorizedException('Sessão encerrada. Faça login novamente.'); }
      return session;
    });
  }
  @Post('activity') @HttpCode(200)
  async activity(@Body() body: unknown, @Req() request: CabecalhosRequest, @Res({ passthrough: true }) response: RespostaCookie) {
    return this.executar(async () => {
      corpoVazio(body);
      const session = await this.auth.atividade(this.cookies.ler(request));
      if (!session) { this.cookies.limpar(response); throw new UnauthorizedException('Sessão encerrada. Faça login novamente.'); }
      return session;
    });
  }
  @Post('logout') @HttpCode(204)
  async logout(@Body() body: unknown, @Req() request: CabecalhosRequest, @Res({ passthrough: true }) response: RespostaCookie) {
    return this.executar(async () => {
      corpoVazio(body);
      await this.auth.logout(this.cookies.ler(request));
      this.cookies.limpar(response);
    });
  }
}
