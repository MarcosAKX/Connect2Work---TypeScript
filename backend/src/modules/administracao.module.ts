import { Module, type DynamicModule, type OnModuleDestroy } from '@nestjs/common';
import { COOKIE_ADMIN, USUARIOS_ADMIN, UsuariosAdministrativosController } from '../controllers/usuarios-administrativos.controller';
import { CookieSessao } from '../security/cookie-sessao';
import type { ServicoUsuariosAdministrativos } from '../services/servico-usuarios-administrativos';
import type { ServicoCatalogoAdministrativo } from '../services/servico-catalogo-administrativo';
import type { ServicoImagens } from '../services/servico-imagens';
import type { AcessoAdministrativo } from '../security/acesso-administrativo';
import { CatalogoAdministrativoController, CATALOGO_ADMIN } from '../controllers/catalogo-administrativo.controller';
import { ImagensController, GuardaImagens, CapacidadeUpload, IMAGENS_ADMIN, ACESSO_IMAGENS } from '../controllers/imagens.controller';
export interface AdministracaoDependencies { service: ServicoUsuariosAdministrativos; https: boolean; lifecycle?: OnModuleDestroy; catalogo?: { service: ServicoCatalogoAdministrativo; imagens: ServicoImagens; acesso: AcessoAdministrativo; lifecycles: OnModuleDestroy[] }; }
@Module({})
export class AdministracaoModule {
  static register(deps: AdministracaoDependencies): DynamicModule {
    return { module: AdministracaoModule, controllers: [UsuariosAdministrativosController, ...(deps.catalogo ? [CatalogoAdministrativoController, ImagensController] : [])], providers: [
      { provide: USUARIOS_ADMIN, useValue: deps.service }, { provide: COOKIE_ADMIN, useValue: new CookieSessao(deps.https) },
      ...(deps.lifecycle ? [{ provide: 'ADMIN_LIFECYCLE', useValue: deps.lifecycle }] : []),
      ...(deps.catalogo ? [GuardaImagens, CapacidadeUpload, { provide: CATALOGO_ADMIN, useValue: deps.catalogo.service }, { provide: IMAGENS_ADMIN, useValue: deps.catalogo.imagens }, { provide: ACESSO_IMAGENS, useValue: deps.catalogo.acesso }, ...deps.catalogo.lifecycles.map((value, index) => ({ provide: 'CATALOGO_LIFECYCLE_' + index, useValue: value }))] : [])
    ] };
  }
}
