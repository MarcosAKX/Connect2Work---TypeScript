import { Controller, Get, Header, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { Readiness } from '../infrastructure/database/database.service';
export const READINESS = Symbol('READINESS');
@Controller()
export class HealthController {
  constructor(@Inject(READINESS) private readonly database: Readiness) {}
  @Get('health')
  @Header('Cache-Control', 'no-store')
  health(): { status: 'ok' } { return { status: 'ok' }; }
  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready(): Promise<{ status: 'ready' }> {
    let available = false;
    try { available = await this.database.isReady(); } catch { /* Falha interna não deve ir para HTTP. */ }
    if (!available) throw new ServiceUnavailableException({ status: 'unavailable' });
    return { status: 'ready' };
  }
}