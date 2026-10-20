import type { OnModuleDestroy } from '@nestjs/common';
import type { RepositorioArquivosImagens } from '../repositories/contracts/repositorio-arquivos-imagens';
import type { ArmazenamentoImagens } from '../storage/armazenamento-imagens';
export class LimpezaImagens implements OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined; private running: Promise<void> | undefined;
  constructor(private readonly repo: RepositorioArquivosImagens, private readonly storage: ArmazenamentoImagens) {}
  iniciar(): void { this.timer = setInterval(() => { void this.executarLote(20).catch(() => { /* Intenções persistidas serão retomadas. */ }); }, 60000); this.timer.unref(); }
  executarLote(limite: number): Promise<void> {
    if (this.running) return this.running;
    this.running = this.limpar(Math.min(20, Math.max(0, Math.floor(limite)))).finally(() => { this.running = undefined; }); return this.running;
  }
  private async limpar(limite: number): Promise<void> {
    for (let i = 0; i < limite; i++) {
      const row = await this.repo.reivindicarLimpeza(); if (!row || !row.leaseId) return;
      try { await this.storage.remover(row.chaveTemporaria, 'authenticated'); await this.storage.remover(row.chavePublica, 'upload'); await this.repo.atualizar(row.id, row.leaseId, 'removido'); }
      catch { await this.repo.falhou(row.id, row.leaseId); }
    }
  }
  async onModuleDestroy(): Promise<void> { if (this.timer) clearInterval(this.timer); if (this.running) await this.running; }
}
