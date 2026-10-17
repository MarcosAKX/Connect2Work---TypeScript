import { Module, type DynamicModule } from '@nestjs/common';
import { HealthController, READINESS } from '../controllers/health.controller';
import type { Readiness } from '../database/database.service';
@Module({})
export class HealthModule {
  static register(database: Readiness): DynamicModule {
    return { module: HealthModule, controllers: [HealthController], providers: [{ provide: READINESS, useValue: database }] };
  }
}