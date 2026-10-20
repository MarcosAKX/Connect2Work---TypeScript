import { Module, type DynamicModule, type OnModuleDestroy } from '@nestjs/common';
import type { ServicoAgendamentosAdministrativos } from '../services/servico-agendamentos-administrativos';
import type { AuthConfig } from '../config/auth-environment';
import { CookieSessao } from '../security/cookie-sessao';
import { AgendamentosAdministrativosController,AGENDAMENTOS_ADMIN,COOKIE_AGENDAMENTOS } from '../controllers/agendamentos-administrativos.controller';
export interface AgendamentosAdministrativosDependencies { service: ServicoAgendamentosAdministrativos; config: AuthConfig; lifecycle?: OnModuleDestroy; }
@Module({})
export class AgendamentosAdministrativosModule {
 static register(deps: AgendamentosAdministrativosDependencies): DynamicModule {return {module:AgendamentosAdministrativosModule,controllers:[AgendamentosAdministrativosController],providers:[{provide:AGENDAMENTOS_ADMIN,useValue:deps.service},{provide:COOKIE_AGENDAMENTOS,useValue:new CookieSessao(deps.config.https)},...(deps.lifecycle?[{provide:'AGENDAMENTOS_LIFECYCLE',useValue:deps.lifecycle}]:[])]};}
}
