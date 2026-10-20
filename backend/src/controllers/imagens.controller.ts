import { Controller, Inject, Injectable, Post, Req, ServiceUnavailableException, UploadedFile, UseGuards, UseInterceptors, type CanActivate, type ExecutionContext, type NestInterceptor, type CallHandler } from '@nestjs/common';
import { finalize } from 'rxjs';
import { LimiteAdministrativo } from '../security/limite-administrativo';
import { FileInterceptor } from '@nestjs/platform-express';
import { LIMITE_IMAGEM_ORIGINAL } from '../config/limites-imagens';
import { CookieSessao, type CabecalhosRequest } from '../security/cookie-sessao';
import { AcessoAdministrativo } from '../security/acesso-administrativo';
import { ServicoImagens } from '../services/servico-imagens';
import { COOKIE_ADMIN } from './usuarios-administrativos.controller';
export const IMAGENS_ADMIN = Symbol('IMAGENS_ADMIN');
export const ACESSO_IMAGENS = Symbol('ACESSO_IMAGENS');
@Injectable()
export class GuardaImagens implements CanActivate {
  private readonly limit = new LimiteAdministrativo();
  constructor(@Inject(ACESSO_IMAGENS) private readonly access: AcessoAdministrativo, @Inject(COOKIE_ADMIN) private readonly cookie: CookieSessao) {}
  async canActivate(context: ExecutionContext): Promise<boolean> { const req = context.switchToHttp().getRequest<CabecalhosRequest>(); const actor = await this.access.exigir(this.cookie.ler(req)); this.limit.verificar(actor.id, true); return true; }
}
@Injectable()
export class CapacidadeUpload implements NestInterceptor {
  private active = 0;
  intercept(_context: ExecutionContext, next: CallHandler) {
    // A reserva precede o parser multipart e limita também os buffers ainda sendo recebidos.
    if (this.active >= 2) throw new ServiceUnavailableException('Aguarde o processamento das imagens.');
    this.active++;
    try { return next.handle().pipe(finalize(() => { this.active--; })); } catch (error: unknown) { this.active--; throw error; }
  }
}
@Controller('admin/imagens')
export class ImagensController {
  constructor(@Inject(IMAGENS_ADMIN) private readonly service: ServicoImagens, @Inject(COOKIE_ADMIN) private readonly cookie: CookieSessao) {}
  @Post()
  @UseGuards(GuardaImagens)
  @UseInterceptors(CapacidadeUpload, FileInterceptor('file', { limits: { fileSize: LIMITE_IMAGEM_ORIGINAL, files: 1, fields: 0, parts: 1 } }))
  enviar(@Req() req: CabecalhosRequest, @UploadedFile() file: unknown) { return this.service.enviar(this.cookie.ler(req), file); }
}
