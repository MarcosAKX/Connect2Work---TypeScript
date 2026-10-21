import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { CookieSessao, type CabecalhosRequest } from '../security/cookie-sessao';
import { ServicoTarefas } from '../services/servico-tarefas';
import { COOKIE_ADMIN } from './usuarios-administrativos.controller';
export const TAREFAS = Symbol('TAREFAS');
@Controller('admin/tarefas')
export class TarefasController {
  constructor(@Inject(TAREFAS) private readonly service: ServicoTarefas, @Inject(COOKIE_ADMIN) private readonly cookie: CookieSessao) {}
  @Get() listar(@Req() req: CabecalhosRequest, @Query() q: unknown) { return this.service.listar(this.cookie.ler(req), q); }
  @Get('equipe') equipe(@Req() req: CabecalhosRequest) { return this.service.equipe(this.cookie.ler(req)); }
  @Get('atencao') atencao(@Req() req: CabecalhosRequest) { return this.service.atencao(this.cookie.ler(req)); }
  @Post() criar(@Req() req: CabecalhosRequest, @Body() body: unknown) { return this.service.criar(this.cookie.ler(req), body); }
  @Patch(':id') editar(@Req() req: CabecalhosRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.editar(this.cookie.ler(req), id, body); }
  @Patch(':id/situacao') mover(@Req() req: CabecalhosRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.mover(this.cookie.ler(req), id, body); }
  @Delete(':id') excluir(@Req() req: CabecalhosRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.excluir(this.cookie.ler(req), id, body); }
}
