import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { CookieSessao, type CabecalhosRequest } from '../security/cookie-sessao';
import { ServicoCatalogoAdministrativo } from '../services/servico-catalogo-administrativo';
import { COOKIE_ADMIN } from './usuarios-administrativos.controller';
export const CATALOGO_ADMIN = Symbol('CATALOGO_ADMIN');
@Controller('admin')
export class CatalogoAdministrativoController {
  constructor(@Inject(CATALOGO_ADMIN) private readonly service: ServicoCatalogoAdministrativo, @Inject(COOKIE_ADMIN) private readonly cookie: CookieSessao) {}
  @Get('servicos') servicos(@Req() req: CabecalhosRequest) { return this.service.listarServicos(this.cookie.ler(req), true); }
  @Post('servicos') criarServico(@Req() req: CabecalhosRequest, @Body() body: unknown) { return this.service.criarServico(this.cookie.ler(req), body); }
  @Patch('servicos/:id') servico(@Req() req: CabecalhosRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.atualizarServico(this.cookie.ler(req), id, body); }
  @Get('unidades') unidades(@Req() req: CabecalhosRequest, @Query() q: unknown) { return this.service.listarUnidades(this.cookie.ler(req), q); }
  @Get('unidades/opcoes') opcoes(@Req() req: CabecalhosRequest, @Query() q: unknown) { return this.service.opcoesUnidades(this.cookie.ler(req), q); }
  @Post('unidades') criarUnidade(@Req() req: CabecalhosRequest, @Body() body: unknown) { return this.service.criarUnidade(this.cookie.ler(req), body); }
  @Patch('unidades/:id') unidade(@Req() req: CabecalhosRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.atualizarUnidade(this.cookie.ler(req), id, body); }
  @Delete('unidades/:id') excluirUnidade(@Req() req: CabecalhosRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.excluirUnidade(this.cookie.ler(req), id, body); }
  @Get('salas') salas(@Req() req: CabecalhosRequest, @Query() q: unknown) { return this.service.listarSalas(this.cookie.ler(req), q); }
  @Post('salas') criarSala(@Req() req: CabecalhosRequest, @Body() body: unknown) { return this.service.criarSala(this.cookie.ler(req), body); }
  @Patch('salas/:id') sala(@Req() req: CabecalhosRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.atualizarSala(this.cookie.ler(req), id, body); }
  @Delete('salas/:id') excluirSala(@Req() req: CabecalhosRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.excluirSala(this.cookie.ler(req), id, body); }
}

@Controller('servicos')
export class ServicosEmpresariaisController {
  constructor(@Inject(CATALOGO_ADMIN) private readonly service: ServicoCatalogoAdministrativo, @Inject(COOKIE_ADMIN) private readonly cookie: CookieSessao) {}
  @Get() listar(@Req() req: CabecalhosRequest) { return this.service.listarServicos(this.cookie.ler(req), false); }
}
