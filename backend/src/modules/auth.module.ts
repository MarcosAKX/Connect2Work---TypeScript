import { Module, type DynamicModule, type OnModuleDestroy } from '@nestjs/common';
import { CadastroController, CADASTRO } from '../controllers/cadastro.controller';
import { AutenticacaoController, AUTENTICACAO, COOKIE_SESSAO } from '../controllers/autenticacao.controller';
import { CookieSessao } from '../security/cookie-sessao';
import type { AuthConfig } from '../config/auth-environment';
import type { ServicoCadastro } from '../services/servico-cadastro';
import type { ServicoAutenticacao } from '../services/servico-autenticacao';
export interface CadastroDependencies {
  service: ServicoCadastro; lifecycle?: OnModuleDestroy;
  auth?: { service: ServicoAutenticacao; config: AuthConfig; lifecycle?: OnModuleDestroy };
}
@Module({})
export class AuthModule {
  static register(cadastro: CadastroDependencies): DynamicModule {
    return {
      module: AuthModule,
      controllers: [CadastroController, ...(cadastro.auth ? [AutenticacaoController] : [])],
      providers: [
        { provide: CADASTRO, useValue: cadastro.service },
        ...(cadastro.lifecycle ? [{ provide: 'USUARIOS_LIFECYCLE', useValue: cadastro.lifecycle }] : []),
        ...(cadastro.auth ? [
          { provide: AUTENTICACAO, useValue: cadastro.auth.service },
          { provide: COOKIE_SESSAO, useValue: new CookieSessao(cadastro.auth.config.https) },
          ...(cadastro.auth.lifecycle ? [{ provide: 'SESSOES_LIFECYCLE', useValue: cadastro.auth.lifecycle }] : [])
        ] : [])
      ]
    };
  }
}
