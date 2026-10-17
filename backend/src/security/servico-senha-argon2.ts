import { hash, verify, argon2id } from 'argon2';
import { ServiceUnavailableException } from '@nestjs/common';
import type { GeradorHash } from './gerador-hash';
import type { VerificadorSenha } from './verificador-senha';
export class ServicoSenha implements GeradorHash, VerificadorSenha {
  private emAndamento = 0;
  private async executar<T>(operation: () => Promise<T>): Promise<T> {
    if (this.emAndamento >= 2) throw new ServiceUnavailableException('Tente novamente em instantes.');
    this.emAndamento++;
    try { return await operation(); } finally { this.emAndamento--; }
  }
  async gerar(senha: string): Promise<string> {
    return this.executar(() => hash(senha, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }));
  }
  async verificar(senhaHash: string, senha: string): Promise<boolean> {
    return this.executar(async () => {
      try { return await verify(senhaHash, senha); } catch { return false; }
    });
  }
}
