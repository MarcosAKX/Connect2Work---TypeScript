import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { CabecalhosRequest } from '../security/cookie-sessao';
import { CookieSessao } from '../security/cookie-sessao';
import { ServicoUsuariosAdministrativos } from '../services/servico-usuarios-administrativos';
export const USUARIOS_ADMIN = Symbol('USUARIOS_ADMIN');
export const COOKIE_ADMIN = Symbol('COOKIE_ADMIN');
@Controller('admin')
export class UsuariosAdministrativosController {
  constructor(@Inject(USUARIOS_ADMIN) private readonly service: ServicoUsuariosAdministrativos, @Inject(COOKIE_ADMIN) private readonly cookie: CookieSessao) {}
  @Get('usuarios') listar(@Req() req: CabecalhosRequest, @Query() query: unknown) { return this.service.listar(this.cookie.ler(req), query); }
  @Post('usuarios') criar(@Req() req: CabecalhosRequest, @Body() body: unknown) { return this.service.criar(this.cookie.ler(req), body); }
  @Patch('usuarios/:id') atualizar(@Req() req: CabecalhosRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.atualizar(this.cookie.ler(req), id, body); }
  @Patch('usuarios/:id/perfil') perfil(@Req() req: CabecalhosRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.alterarPerfil(this.cookie.ler(req), id, body); }
  @Patch('usuarios/:id/status') status(@Req() req: CabecalhosRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.alterarStatus(this.cookie.ler(req), id, body); }
  @Get('equipe') equipe(@Req() req: CabecalhosRequest) { return this.service.listarEquipe(this.cookie.ler(req)); }
  @Get('clientes/busca') clientes(@Req() req: CabecalhosRequest, @Query() query: unknown) { return this.service.buscarClientes(this.cookie.ler(req), query); }
}
