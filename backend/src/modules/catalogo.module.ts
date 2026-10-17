import { Module, type DynamicModule, type OnModuleDestroy } from '@nestjs/common';
import { UnidadesController, UNIDADES, ACESSO_UNIDADES, COOKIE_UNIDADES, type AcessoUnidades } from '../controllers/unidades.controller';
import type { ServicoUnidades } from '../services/servico-unidades';
import { CookieSessao } from '../security/cookie-sessao';
export interface CatalogoDependencies { service: ServicoUnidades; auth: AcessoUnidades; https: boolean; lifecycle?: OnModuleDestroy; }
@Module({})
export class CatalogoModule {
  static register(deps: CatalogoDependencies): DynamicModule {
    return { module: CatalogoModule, controllers: [UnidadesController], providers: [
      { provide: UNIDADES, useValue: deps.service }, { provide: ACESSO_UNIDADES, useValue: deps.auth },
      { provide: COOKIE_UNIDADES, useValue: new CookieSessao(deps.https) },
      ...(deps.lifecycle ? [{ provide: 'CATALOGO_LIFECYCLE', useValue: deps.lifecycle }] : [])
    ] };
  }
}
