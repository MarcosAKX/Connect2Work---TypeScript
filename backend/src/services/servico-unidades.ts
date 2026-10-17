import type { RepositorioUnidades } from '../repositories/contracts/repositorio-unidades';
export class ServicoUnidades {
  constructor(private readonly unidades: RepositorioUnidades) {}
  async listar() { return this.unidades.listar(); }
}
