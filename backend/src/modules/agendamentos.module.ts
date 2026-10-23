import { Module, type DynamicModule, type OnModuleDestroy } from '@nestjs/common';
import type { AuthConfig } from '../config/auth-environment';
import { CookieSessao } from '../security/cookie-sessao';
import type { ServicoAgendamentos } from '../services/servico-agendamentos';
import { AgendamentosController, AGENDAMENTOS, COOKIE_CLIENTE } from '../controllers/agendamentos.controller';
export interface AgendamentosDependencies { service:ServicoAgendamentos; config:AuthConfig; lifecycle?:OnModuleDestroy; }
@Module({})
export class AgendamentosModule {
  static register(deps:AgendamentosDependencies):DynamicModule { return { module:AgendamentosModule, controllers:[AgendamentosController], providers:[{provide:AGENDAMENTOS,useValue:deps.service},{provide:COOKIE_CLIENTE,useValue:new CookieSessao(deps.config.https)},...(deps.lifecycle?[{provide:'AGENDAMENTOS_CLIENTE_LIFECYCLE',useValue:deps.lifecycle}]:[])] }; }
}
