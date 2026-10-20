import type { RepositorioTarefas } from '../repositories/contracts/repositorio-tarefas';
import { AcessoAdministrativo } from '../security/acesso-administrativo';
import { LimiteAdministrativo } from '../security/limite-administrativo';
import { criarTarefa, editarTarefa, consultaTarefas, mudarSituacao, versaoExclusao } from './validacao-tarefas';
import { uuid } from './validacao-usuario-administrativo';
export class ServicoTarefas {
  private readonly limit = new LimiteAdministrativo();
  constructor(private readonly repo: RepositorioTarefas, private readonly acesso: AcessoAdministrativo) {}
  private async actor(token: string | null, write = false) {
    const actor = await this.acesso.exigir(token, ['admin', 'secretaria']);
    this.limit.verificar(actor.id, write); return actor;
  }
  async listar(token: string | null, query: unknown) { return this.repo.listar(await this.actor(token), consultaTarefas(query)); }
  async equipe(token: string | null) { await this.actor(token); return this.repo.equipe(); }
  async atencao(token: string | null) { await this.actor(token); return { count: await this.repo.atencao() }; }
  async criar(token: string | null, input: unknown) { return this.repo.criar(await this.actor(token, true), criarTarefa(input)); }
  async editar(token: string | null, id: string, input: unknown) { return this.repo.alterar(await this.actor(token, true), uuid(id), { action: 'update', data: editarTarefa(input) }); }
  async mover(token: string | null, id: string, input: unknown) { return this.repo.alterar(await this.actor(token, true), uuid(id), { action: 'status', ...mudarSituacao(input) }); }
  async excluir(token: string | null, id: string, input: unknown) { await this.repo.alterar(await this.actor(token, true), uuid(id), { action: 'delete', expectedVersion: versaoExclusao(input) }); return { deleted: true }; }
}
