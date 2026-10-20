import { BadRequestException, ConflictException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { RepositorioArquivosImagens } from '../repositories/contracts/repositorio-arquivos-imagens';
import type { ArmazenamentoImagens } from '../storage/armazenamento-imagens';
import { AcessoAdministrativo, type AtorAdministrativo } from '../security/acesso-administrativo';
import { ProcessadorImagem } from '../security/processador-imagem';
import { LimiteAdministrativo } from '../security/limite-administrativo';
import { uuid } from './validacao-usuario-administrativo';
export class ServicoImagens {
  private processando = 0; private readonly limite = new LimiteAdministrativo();
  private readonly uploads = new Map<string, { inicio: number; count: number }>();
  constructor(private readonly repo: RepositorioArquivosImagens, private readonly storage: ArmazenamentoImagens, private readonly acesso: AcessoAdministrativo, private readonly processor = new ProcessadorImagem()) {}
  async enviar(token: string | null, file: unknown): Promise<{ id: string; expiresAt: string }> {
    const actor = await this.acesso.exigir(token); this.limite.verificar(actor.id, true); const now = Date.now();
    for (const [id, entry] of this.uploads) if (now - entry.inicio >= 60000) this.uploads.delete(id);
    const entry = this.uploads.get(actor.id) ?? { inicio: now, count: 0 }; if (!this.uploads.has(actor.id) && this.uploads.size >= 1000) throw new HttpException('Aguarde antes de enviar novas imagens.', 429);
    this.uploads.set(actor.id, entry); if (++entry.count > 10) throw new HttpException('Envie no máximo 10 imagens por minuto.', 429);
    if (this.processando >= 2) throw new ServiceUnavailableException('Aguarde o processamento das imagens.');
    if (!file || typeof file !== 'object' || !('buffer' in file) || !Buffer.isBuffer(file.buffer) || !('mimetype' in file) || !['image/jpeg','image/png','image/webp'].includes(String(file.mimetype))) throw new BadRequestException('Selecione uma imagem JPEG, PNG ou WebP.');
    this.processando++;
    try {
      const prepared = await this.processor.processar(file.buffer); const row = await this.repo.registrar(actor, { bytes: prepared.conteudo.length, largura: prepared.largura, altura: prepared.altura });
      if (!row.leaseId) throw new Error('Lease ausente');
      try { const meta = await this.storage.enviarTemporaria(row.chaveTemporaria, prepared.conteudo); await this.repo.atualizar(row.id, row.leaseId, 'temporario', meta); }
      catch { await this.repo.falhou(row.id, row.leaseId); throw new ServiceUnavailableException('Não foi possível confirmar o envio da imagem. Tente novamente.'); }
      return { id: row.id, expiresAt: row.expiraEm.toISOString() };
    } finally { this.processando--; }
  }
  async prepararVinculo(actor: AtorAdministrativo, ids: readonly string[]): Promise<void> {
    if (ids.length > 6 || new Set(ids).size !== ids.length) throw new BadRequestException('Selecione até seis imagens diferentes.');
    for (const id of ids) {
      if (id.startsWith('legacy:')) continue; uuid(id);
      const row = await this.repo.reivindicarPublicacao(actor, id); if (row.estado === 'vinculado' || row.estado === 'disponivel') continue;
      if (!row.leaseId) throw new ConflictException('Imagem em processamento.');
      try {
        // Consulta também recupera rename concluído cuja resposta se perdeu.
        const meta = await this.storage.consultar(row.chavePublica, 'upload') ?? await this.storage.publicar(row.chaveTemporaria, row.chavePublica);
        await this.repo.atualizar(row.id, row.leaseId, 'disponivel', meta);
      } catch { await this.repo.falhou(row.id, row.leaseId); throw new ServiceUnavailableException('Não foi possível preparar as fotos. As imagens anteriores foram preservadas.'); }
    }
  }
}
