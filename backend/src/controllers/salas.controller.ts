import { Controller, Get, Header, Inject, Param, Req, UnauthorizedException, NotFoundException, ServiceUnavailableException, HttpException } from '@nestjs/common';
import type { ServicoSalas } from '../services/servico-salas';
import { ACESSO_UNIDADES, COOKIE_UNIDADES, type AcessoUnidades } from './unidades.controller';
import { CookieSessao, type CabecalhosRequest } from '../security/cookie-sessao';
export const SALAS = Symbol('SALAS');
@Controller()
export class SalasController {
  constructor(@Inject(SALAS) private readonly salas: ServicoSalas,
    @Inject(ACESSO_UNIDADES) private readonly acesso: AcessoUnidades,
    @Inject(COOKIE_UNIDADES) private readonly cookies: CookieSessao) {}
  private async executar<T>(request: CabecalhosRequest, action: () => Promise<T>): Promise<T> {
    try {
      if (!await this.acesso.consultar(this.cookies.ler(request))) throw new UnauthorizedException('Sessão encerrada. Faça login novamente.');
      return await action();
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Não foi possível carregar as salas. Tente novamente.');
    }
  }
  @Get('unidades/:unidadeId/salas') @Header('Cache-Control', 'no-store')
  async listar(@Param('unidadeId') id: string, @Req() request: CabecalhosRequest) {
    return this.executar(request, () => this.salas.listarPorUnidade(id));
  }
  @Get('salas/:salaId') @Header('Cache-Control', 'no-store')
  async buscar(@Param('salaId') id: string, @Req() request: CabecalhosRequest) {
    return this.executar(request, async () => {
      const room = await this.salas.buscarPorId(id);
      if (!room) throw new NotFoundException('Sala não encontrada.');
      return room;
    });
  }
}
