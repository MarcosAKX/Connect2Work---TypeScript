import { Module, type DynamicModule, type OnModuleDestroy } from '@nestjs/common';
import { COOKIE_ADMIN, USUARIOS_ADMIN, UsuariosAdministrativosController } from '../controllers/usuarios-administrativos.controller';
import { CookieSessao } from '../security/cookie-sessao';
import type { ServicoUsuariosAdministrativos } from '../services/servico-usuarios-administrativos';
export interface AdministracaoDependencies { service: ServicoUsuariosAdministrativos; https: boolean; lifecycle?: OnModuleDestroy; }
@Module({})
export class AdministracaoModule {
  static register(deps: AdministracaoDependencies): DynamicModule {
    return { module: AdministracaoModule, controllers: [UsuariosAdministrativosController], providers: [
      { provide: USUARIOS_ADMIN, useValue: deps.service }, { provide: COOKIE_ADMIN, useValue: new CookieSessao(deps.https) },
      ...(deps.lifecycle ? [{ provide: 'ADMIN_LIFECYCLE', useValue: deps.lifecycle }] : [])
    ] };
  }
}
