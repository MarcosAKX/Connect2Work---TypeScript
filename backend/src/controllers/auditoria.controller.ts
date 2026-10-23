import { Controller, Get, HttpException, Inject, Query, Req, ServiceUnavailableException } from '@nestjs/common';
import { CookieSessao, type CabecalhosRequest } from '../security/cookie-sessao';
import { COOKIE_ADMIN } from './usuarios-administrativos.controller';
import { ServicoAuditoria } from '../services/servico-auditoria';
export const AUDITORIA=Symbol('AUDITORIA');
@Controller('admin/atividades')
export class AuditoriaController {
  constructor(@Inject(AUDITORIA) private readonly service:ServicoAuditoria,@Inject(COOKIE_ADMIN) private readonly cookie:CookieSessao){}
  @Get() async listar(@Req() req:CabecalhosRequest,@Query() query:unknown){
    try {return await this.service.listar(this.cookie.ler(req),query);}
    catch(error:unknown){if(error instanceof HttpException)throw error;throw new ServiceUnavailableException('Não foi possível consultar as atividades. Tente novamente.');}
  }
}
