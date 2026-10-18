import { Module, type DynamicModule, type OnModuleDestroy } from '@nestjs/common';
import { UnidadesController, UNIDADES, ACESSO_UNIDADES, COOKIE_UNIDADES, type AcessoUnidades } from '../controllers/unidades.controller';
import type { ServicoUnidades } from '../services/servico-unidades';
import { CookieSessao } from '../security/cookie-sessao';
import { SalasController, SALAS } from '../controllers/salas.controller';
import type { ServicoSalas } from '../services/servico-salas';
export interface CatalogoDependencies { service: ServicoUnidades; auth: AcessoUnidades; https: boolean; lifecycle?: OnModuleDestroy;
  salas?: { service: ServicoSalas; lifecycle?: OnModuleDestroy }; }
@Module({})
export class CatalogoModule {
  static register(deps: CatalogoDependencies): DynamicModule {
    return { module: CatalogoModule, controllers: [UnidadesController, ...(deps.salas ? [SalasController] : [])], providers: [
      { provide: UNIDADES, useValue: deps.service }, { provide: ACESSO_UNIDADES, useValue: deps.auth },
      { provide: COOKIE_UNIDADES, useValue: new CookieSessao(deps.https) },
      ...(deps.salas ? [{ provide: SALAS, useValue: deps.salas.service },
        ...(deps.salas.lifecycle ? [{ provide: 'SALAS_LIFECYCLE', useValue: deps.salas.lifecycle }] : [])] : []),
      ...(deps.lifecycle ? [{ provide: 'CATALOGO_LIFECYCLE', useValue: deps.lifecycle }] : [])
    ] };
  }
}
