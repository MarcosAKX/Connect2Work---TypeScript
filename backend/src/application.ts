import 'reflect-metadata';
import { Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HealthController, READINESS } from './api/health.controller';
import type { Readiness } from './infrastructure/database/database.service';
@Module({})
class AppModule {}
export async function createApplication(database: Readiness): Promise<INestApplication> {
  const app = await NestFactory.create({
    module: AppModule,
    controllers: [HealthController],
    providers: [{ provide: READINESS, useValue: database }]
  }, { logger: false, bodyParser: false });
  app.use((_request: unknown, response: { removeHeader(name: string): void; setHeader(name: string, value: string): void }, next: () => void) => {
    response.removeHeader('X-Powered-By');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  return app;
}