import { BadRequestException } from '@nestjs/common';
export class PoliticaSenha {
  normalizar(input: unknown): string {
    if (typeof input !== 'string' || input.length < 6) throw new BadRequestException('A senha deve ter pelo menos 6 caracteres.');
    if (/\s/.test(input)) throw new BadRequestException('A senha nao pode conter espacos.');
    // Política aprovada: o sufixo após 128 não participa da autenticação.
    return input.slice(0, 128);
  }
}
