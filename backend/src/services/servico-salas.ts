import { BadRequestException } from '@nestjs/common';
import type { RepositorioSalas } from '../repositories/contracts/repositorio-salas';
export class ServicoSalas {
  constructor(private readonly salas: RepositorioSalas) {}
  private validarId(id: string): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new BadRequestException('Identificador inválido.');
  }
  async listarPorUnidade(id: string) { this.validarId(id); return this.salas.listarPorUnidade(id); }
  async buscarPorId(id: string) { this.validarId(id); return this.salas.buscarPorId(id); }
}
