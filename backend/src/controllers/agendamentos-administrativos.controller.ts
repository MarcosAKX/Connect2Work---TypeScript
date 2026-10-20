import { Controller, Get, Post, Patch, Param, Query, Body, Req, Res, Inject, HttpException, ServiceUnavailableException } from '@nestjs/common';
import { CookieSessao, type CabecalhosRequest } from '../security/cookie-sessao';
import { ServicoAgendamentosAdministrativos } from '../services/servico-agendamentos-administrativos';
export const AGENDAMENTOS_ADMIN=Symbol('AGENDAMENTOS_ADMIN');export const COOKIE_AGENDAMENTOS=Symbol('COOKIE_AGENDAMENTOS');
@Controller('admin')
export class AgendamentosAdministrativosController {
 constructor(@Inject(AGENDAMENTOS_ADMIN) private readonly service: ServicoAgendamentosAdministrativos,@Inject(COOKIE_AGENDAMENTOS) private readonly cookie: CookieSessao){}
 private async executar<T>(fn: ()=>Promise<T>): Promise<T>{try{return await fn();}catch(error:unknown){if(error instanceof HttpException)throw error;throw new ServiceUnavailableException('Não foi possível concluir a operação. Atualize a lista.');}}
 @Get('agendamentos') listar(@Req() req: CabecalhosRequest,@Query() q: unknown){return this.executar(()=>this.service.listar(this.cookie.ler(req),q));}
 @Get('painel-do-dia') painel(@Req() req: CabecalhosRequest,@Query() q: unknown){return this.executar(()=>this.service.painel(this.cookie.ler(req),q));}
 @Post('agendamentos') criar(@Req() req: CabecalhosRequest,@Body() body: unknown,@Res({passthrough:true}) response: {status(code: number): void}){return this.executar(async()=>{const result=await this.service.criar(this.cookie.ler(req),body);response.status(result.criada?201:200);return result.item;});}
 @Patch('agendamentos/:id/:acao') alterar(@Req() req: CabecalhosRequest,@Param('id') id: string,@Param('acao') name: string,@Body() body: unknown){return this.executar(()=>this.service.alterar(this.cookie.ler(req),id,name,body));}
}
