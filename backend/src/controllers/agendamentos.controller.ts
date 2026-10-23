import { Controller, Get, Post, Param, Query, Body, Req, Res, Inject, HttpException, ServiceUnavailableException } from '@nestjs/common';
import { CookieSessao, type CabecalhosRequest } from '../security/cookie-sessao';
import { ServicoAgendamentos } from '../services/servico-agendamentos';
export const AGENDAMENTOS = Symbol('AGENDAMENTOS');
export const COOKIE_CLIENTE = Symbol('COOKIE_CLIENTE');
@Controller()
export class AgendamentosController {
  constructor(@Inject(AGENDAMENTOS) private readonly service: ServicoAgendamentos, @Inject(COOKIE_CLIENTE) private readonly cookie: CookieSessao) {}
  private async executar<T>(fn: ()=>Promise<T>): Promise<T> { try { return await fn(); } catch(error:unknown) { if(error instanceof HttpException) throw error; throw new ServiceUnavailableException('Não foi possível concluir a solicitação. Tente novamente.'); } }
  @Get('salas/:id/disponibilidade') disponibilidade(@Req() req: CabecalhosRequest, @Param('id') id:string, @Query() query:unknown) { return this.executar(()=>this.service.disponibilidade(this.cookie.ler(req),id,query)); }
  @Post('agendamentos') criar(@Req() req: CabecalhosRequest, @Body() input:unknown, @Res({passthrough:true}) response:{status(code:number):void}) { return this.executar(async()=>{ const result=await this.service.criar(this.cookie.ler(req),input); response.status(result.criada?201:200); return result.reserva; }); }
  @Get('agendamentos/meus') meus(@Req() req:CabecalhosRequest,@Query() query:unknown) { return this.executar(()=>this.service.meus(this.cookie.ler(req),query)); }
  @Post('agendamentos/:id/cancelamento') cancelar(@Req() req:CabecalhosRequest,@Param('id') id:string,@Body() input:unknown) { return this.executar(()=>this.service.cancelar(this.cookie.ler(req),id,input)); }
}
