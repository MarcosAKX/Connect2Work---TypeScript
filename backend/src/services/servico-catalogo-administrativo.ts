import { BadRequestException } from '@nestjs/common';
import type { RepositorioCatalogoAdministrativo, OperacaoCatalogo } from '../repositories/contracts/repositorio-catalogo-administrativo';
import { AcessoAdministrativo } from '../security/acesso-administrativo';
import { LimiteAdministrativo } from '../security/limite-administrativo';
import type { ServicoImagens } from './servico-imagens';
import { objeto, texto, uuid, versao } from './validacao-usuario-administrativo';
import { consultaCatalogo, dadosSala, dadosUnidade, dadosServico } from './validacao-catalogo';
export class ServicoCatalogoAdministrativo {
  private readonly limit = new LimiteAdministrativo();
  constructor(private readonly repo: RepositorioCatalogoAdministrativo, private readonly acesso: AcessoAdministrativo, private readonly imagens: Pick<ServicoImagens, 'prepararVinculo'>) {}
  async listarUnidades(token: string | null, query: unknown) { const actor = await this.acesso.exigir(token); this.limit.verificar(actor.id, false); return this.repo.listarUnidades(consultaCatalogo(query)); }
  async listarSalas(token: string | null, query: unknown) { const actor = await this.acesso.exigir(token); this.limit.verificar(actor.id, false); return this.repo.listarSalas(consultaCatalogo(query)); }
  async opcoesUnidades(token: string | null, query: unknown) { const actor = await this.acesso.exigir(token); this.limit.verificar(actor.id, false); const body = objeto(query, ['search']); return this.repo.opcoes(body.search === undefined ? '' : texto(body.search, 254)); }
  async criarUnidade(token: string | null, body: unknown) { return this.gravar(token, 'unit', 'create', null, body); }
  async atualizarUnidade(token: string | null, id: string, body: unknown) { return this.gravar(token, 'unit', 'update', id, body); }
  async excluirUnidade(token: string | null, id: string, body: unknown) { return this.gravar(token, 'unit', 'delete', id, body); }
  async criarSala(token: string | null, body: unknown) { return this.gravar(token, 'room', 'create', null, body); }
  async atualizarSala(token: string | null, id: string, body: unknown) { return this.gravar(token, 'room', 'update', id, body); }
  async excluirSala(token: string | null, id: string, body: unknown) { return this.gravar(token, 'room', 'delete', id, body); }
  async listarServicos(token: string | null, includeInactive: boolean) {
    const actor = await this.acesso.exigir(token, includeInactive ? ['admin'] : ['client', 'admin', 'secretaria']);
    this.limit.verificar(actor.id, false);
    return this.repo.listarServicos(includeInactive);
  }
  async criarServico(token: string | null, body: unknown) { return this.gravar(token, 'service', 'create', null, body); }
  async atualizarServico(token: string | null, id: string, body: unknown) { return this.gravar(token, 'service', 'update', id, body); }
  private async gravar(token: string | null, entidade: 'unit' | 'room' | 'service', acao: OperacaoCatalogo['acao'], id: string | null, input: unknown) {
    const actor = await this.acesso.exigir(token); this.limit.verificar(actor.id, true);
    const fields = acao === 'delete' ? [] : entidade === 'service' ? ['kind','name','description','primaryFeatures','secondaryFeatures','active','sortOrder','imageId'] : entidade === 'unit' ? ['name','address','description','latitude','longitude','imageId'] : ['name','unitId','capacity','pricePerHour','amenities','imageIds'];
    const body = objeto(input, [...fields, acao === 'create' ? 'requestId' : 'expectedVersion']);
    if (acao === 'create' && typeof body.requestId !== 'string') throw new BadRequestException('Identificador de operação inválido.');
    const op: OperacaoCatalogo = { entidade, acao, id: uuid(acao === 'create' ? texto(body.requestId, 36) : id ?? ''), ...(acao === 'create' ? {} : { expectedVersion: versao(body.expectedVersion) }) };
    if (acao !== 'delete') {
      const data = entidade === 'unit' ? dadosUnidade(body) : entidade === 'room' ? dadosSala(body) : dadosServico(body); op.data = data;
      const ids = data.type !== 'room' ? data.imageId ? [data.imageId] : [] : data.imageIds ?? [];
      await this.imagens.prepararVinculo(actor, ids);
    }
    return this.repo.gravar(actor, op);
  }
}
