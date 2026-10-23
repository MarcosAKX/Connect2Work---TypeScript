import { HttpException } from '@nestjs/common';
import { RelogioSistema, type Relogio } from './relogio';
export class LimiteAgendamentos {
  private readonly entries = new Map<string, { start: number; reads: number; writes: number }>();
  constructor(private readonly clock: Relogio = new RelogioSistema()) {}
  verificar(id: string, write: boolean): void {
    const now = this.clock.agora().getTime();
    for (const [key, entry] of this.entries) if (now-entry.start >= 60000) this.entries.delete(key);
    let entry = this.entries.get(id);
    if (!entry) {
      if (this.entries.size >= 1000) throw new HttpException('Muitas solicitações. Aguarde um minuto.', 429);
      entry = { start: now, reads: 0, writes: 0 }; this.entries.set(id, entry);
    }
    const count = write ? ++entry.writes : ++entry.reads;
    if (count > (write ? 10 : 60)) throw new HttpException('Muitas solicitações. Aguarde um minuto.', 429);
  }
}
