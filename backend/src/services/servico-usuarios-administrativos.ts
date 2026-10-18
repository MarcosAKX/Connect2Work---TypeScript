import { randomUUID } from 'node:crypto';
import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import type { RepositorioUsuariosAdministrativos, OperacaoUsuario } from '../repositories/contracts/repositorio-usuarios-administrativos';
import type { GeradorHash } from '../security/gerador-hash';
import { AcessoAdministrativo } from '../security/acesso-administrativo';
import { LimiteAdministrativo } from '../security/limite-administrativo';
import { PoliticaSenha } from '../security/politica-senha';
import { ativo, consulta, dados, objeto, papel, texto, uuid, versao } from './validacao-usuario-administrativo';
export class ServicoUsuariosAdministrativos {
  private hashing = 0;
  constructor(private readonly repo: RepositorioUsuariosAdministrativos, private readonly acesso: AcessoAdministrativo,
    private readonly senhas: GeradorHash, private readonly limite = new LimiteAdministrativo()) {}
  async listar(token: string | null, query: unknown) {
    const actor = await this.acesso.exigir(token); this.limite.verificar(actor.id, false); return this.repo.listar(consulta(query));
  }
  async listarEquipe(token: string | null) { const actor = await this.acesso.exigir(token, ['admin', 'secretaria']); this.limite.verificar(actor.id, false); return this.repo.equipe(); }
  async buscarClientes(token: string | null, query: unknown) {
    const actor = await this.acesso.exigir(token, ['admin', 'secretaria']); this.limite.verificar(actor.id, false);
    const body = objeto(query, ['search']); return this.repo.clientes(body.search === undefined ? '' : texto(body.search, 254));
  }
  async criar(token: string | null, input: unknown) { return this.gravar(token, randomUUID(), 'create', input); }
  async atualizar(token: string | null, id: string, input: unknown) { return this.gravar(token, uuid(id), 'update', input); }
  async alterarPerfil(token: string | null, id: string, input: unknown) { return this.gravar(token, uuid(id), 'role', input); }
  async alterarStatus(token: string | null, id: string, input: unknown) { return this.gravar(token, uuid(id), 'status', input); }
  private async gravar(token: string | null, id: string, kind: OperacaoUsuario['kind'], input: unknown) {
    const actor = await this.acesso.exigir(token); this.limite.verificar(actor.id, true);
    const keys = kind === 'role' ? ['role', 'expectedVersion'] : kind === 'status' ? ['active', 'expectedVersion'] : ['name', 'email', 'profession', 'phone', 'password', 'role', 'active', ...(kind === 'update' ? ['expectedVersion'] : [])];
    const body = objeto(input, keys);
    const expectedVersion = kind === 'create' ? '' : versao(body.expectedVersion);
    let operation: OperacaoUsuario;
    if (kind === 'role') operation = { kind, id, expectedVersion, role: papel(body.role) };
    else if (kind === 'status') operation = { kind, id, expectedVersion, active: ativo(body.active) };
    else {
      const data = dados(body);
      if (actor.id === id && (data.role !== 'admin' || !data.active)) throw new ConflictException('Sua própria conta administrativa está protegida.');
      if (kind === 'create' || body.password !== undefined) {
        const password = new PoliticaSenha().normalizar(body.password);
        if (this.hashing >= 2) throw new ServiceUnavailableException('Tente novamente em instantes.');
        this.hashing++;
        try { data.senhaHash = await this.senhas.gerar(password); } finally { this.hashing--; }
      }
      operation = kind === 'create' ? { kind, id, data } : { kind, id, expectedVersion, data };
    }
    if (id === actor.id && ((operation.kind === 'role' && operation.role !== 'admin') || (operation.kind === 'status' && !operation.active))) throw new ConflictException('Sua própria conta administrativa está protegida.');
    return this.repo.gravar(actor, operation);
  }
}
