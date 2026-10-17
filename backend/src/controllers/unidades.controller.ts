import { Controller, Get, Header, Inject, Req, UnauthorizedException, ServiceUnavailableException, HttpException } from '@nestjs/common';
import type { ServicoUnidades } from '../services/servico-unidades';
import { CookieSessao, type CabecalhosRequest } from '../security/cookie-sessao';
export const UNIDADES = Symbol('UNIDADES');
export const ACESSO_UNIDADES = Symbol('ACESSO_UNIDADES');
export const COOKIE_UNIDADES = Symbol('COOKIE_UNIDADES');
export interface AcessoUnidades { consultar(token: string | null): Promise<object | null>; }
@Controller('unidades')
export class UnidadesController {
  constructor(@Inject(UNIDADES) private readonly unidades: ServicoUnidades,
    @Inject(ACESSO_UNIDADES) private readonly acesso: AcessoUnidades,
    @Inject(COOKIE_UNIDADES) private readonly cookies: CookieSessao) {}
  @Get() @Header('Cache-Control', 'no-store')
  async listar(@Req() request: CabecalhosRequest) {
    try {
      if (!await this.acesso.consultar(this.cookies.ler(request))) throw new UnauthorizedException('Sessão encerrada. Faça login novamente.');
      return await this.unidades.listar();
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Não foi possível carregar as unidades. Tente novamente.');
    }
  }
}
