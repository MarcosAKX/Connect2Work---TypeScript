import type { AgendamentosDependencies } from './modules/agendamentos.module';
import { type AgendamentosAdministrativosDependencies } from './modules/agendamentos-administrativos.module';
import { protecaoHttp } from './security/protecao-http';
import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { CadastroDependencies } from './modules/auth.module';
import type { Readiness } from './database/database.service';
import type { CatalogoDependencies } from './modules/catalogo.module';
import type { AdministracaoDependencies } from './modules/administracao.module';
export async function createApplication(database: Readiness, cadastro?: CadastroDependencies, catalogo?: CatalogoDependencies, admin?: AdministracaoDependencies, bookings?: AgendamentosAdministrativosDependencies, clientBookings?: AgendamentosDependencies): Promise<INestApplication> {
  if (admin && !cadastro?.auth) throw new Error('Administração exige autenticação configurada.');
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(database, cadastro, catalogo, admin, bookings, clientBookings), { logger: false, bodyParser: false });
  app.use((_request: unknown, response: { removeHeader(name: string): void; setHeader(name: string, value: string): void }, next: () => void) => {
    response.removeHeader('X-Powered-By');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  const security=cadastro?.auth?.config??bookings?.config??clientBookings?.config;
  if (security) app.use(protecaoHttp(security));
  if (cadastro || bookings || clientBookings) app.useBodyParser('json', { limit: '8kb' });
  return app;
}
