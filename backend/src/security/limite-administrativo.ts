import { HttpException } from '@nestjs/common';
import { RelogioSistema, type Relogio } from './relogio';
export class LimiteAdministrativo {
  private readonly entradas = new Map<string, { inicio: number; leituras: number; escritas: number }>();
  constructor(private readonly relogio: Relogio = new RelogioSistema()) {}
  verificar(id: string, escrita: boolean): void {
    const now = this.relogio.agora().getTime();
    for (const [key, value] of this.entradas) if (now - value.inicio >= 60000) this.entradas.delete(key);
    let entry = this.entradas.get(id);
    if (!entry) {
      if (this.entradas.size >= 1000) throw new HttpException('Muitas solicitações. Aguarde um minuto.', 429);
      entry = { inicio: now, leituras: 0, escritas: 0 }; this.entradas.set(id, entry);
    }
    const count = escrita ? ++entry.escritas : ++entry.leituras;
    if (count > (escrita ? 30 : 120)) throw new HttpException('Muitas solicitações. Aguarde um minuto.', 429);
  }
}
