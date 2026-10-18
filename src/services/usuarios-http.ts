import type { UserManagementGateway } from './contracts';
import type { CreateManagedUserInput, UpdateManagedUserInput, UserRole, ManagedUser, ManagedUsersPage, ManagedUsersQuery, ManagedUsersSummary } from '../types/domain';
const failure = 'Não foi possível consultar os usuários. Tente novamente.';
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(failure); return Object.fromEntries(Object.entries(value)); }
function string(value: unknown): string { if (typeof value !== 'string') throw new Error(failure); return value; }
function integer(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error(failure); return value; }
function date(value: unknown): string { const text = string(value); if (!Number.isFinite(Date.parse(text))) throw new Error(failure); return text; }
function user(value: unknown): ManagedUser {
  const o = object(value); const role = o.role;
  if (role !== 'admin' && role !== 'client' && role !== 'secretaria') throw new Error(failure);
  if (typeof o.active !== 'boolean' || typeof o.hasHoursPlan !== 'boolean' || typeof o.hoursBalance !== 'number' || !Number.isFinite(o.hoursBalance) || o.hoursBalance < 0) throw new Error(failure);
  const version = string(o.version); const id = string(o.id); if (!id || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(version)) throw new Error(failure);
  return { id, name: string(o.name), email: string(o.email), profession: string(o.profession), phone: string(o.phone), role, active: o.active,
    createdAt: date(o.createdAt), ...(o.updatedAt === undefined ? {} : { updatedAt: date(o.updatedAt) }), version, hasHoursPlan: o.hasHoursPlan, hoursBalance: o.hoursBalance };
}
function summary(value: unknown): ManagedUsersSummary {
  const o = object(value); const result = { total: integer(o.total), active: integer(o.active), inactive: integer(o.inactive), admin: integer(o.admin), client: integer(o.client), secretaria: integer(o.secretaria) };
  if (result.active + result.inactive !== result.total || result.admin + result.client + result.secretaria !== result.total) throw new Error(failure); return result;
}
export class UsuariosHttpGateway implements Pick<UserManagementGateway, 'listUsersPage' | 'createUser' | 'updateUser' | 'updateUserRole' | 'updateUserStatus'> {
  constructor(private readonly fetcher: typeof fetch = (input, init) => fetch(input, init), private readonly unauthorized: () => void | Promise<unknown> = () => {}) {}
  private async request(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
    try {
      let response: Response;
      try { response = await this.fetcher('/api/admin/usuarios' + path, { method, credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-C2W-Request': '1' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
      catch { throw new Error(method === 'GET' ? failure : 'Não foi possível confirmar a gravação. Atualize a lista antes de tentar novamente.'); }
      if (response.status === 401) { try { await this.unauthorized(); } catch { /* Preserva o erro de sessão original. */ } throw new Error('Sessão encerrada. Faça login novamente.'); }
      if (response.status === 403) throw new Error('Você não tem permissão para esta operação.');
      if (response.status === 409) throw new Error('Não foi possível salvar: há conflito de dados ou e-mail. Recarregue a lista antes de editar.');
      if (response.status === 400) throw new Error('Dados inválidos. Confira os campos informados.');
      if (response.status === 404) throw new Error('Usuário não encontrado. Atualize a lista.');
      if (response.status === 429) throw new Error('Muitas solicitações. Aguarde um minuto.');
      if (response.status !== 200 && response.status !== 201) throw new Error(method === 'GET' ? failure : 'Não foi possível confirmar a gravação. Atualize a lista.');
      try { const value: unknown = await response.json(); return value; } catch { throw new Error(failure); }
    } finally { clearTimeout(timer); }
  }
  async listUsersPage(query: ManagedUsersQuery): Promise<ManagedUsersPage> {
    const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
    if (query.search) params.set('search', query.search); if (query.role) params.set('role', query.role); if (query.active !== undefined) params.set('active', String(query.active));
    const o = object(await this.request('?' + params)); if (!Array.isArray(o.items)) throw new Error(failure);
    const items = o.items.map(user); const page = integer(o.page); const pageSize = integer(o.pageSize); const total = integer(o.total); const counts = summary(o.summary);
    if (page !== query.page || pageSize !== query.pageSize || pageSize < 1 || pageSize > 100 || items.length > Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize)) || total > counts.total || new Set(items.map(u => u.id)).size !== items.length) throw new Error(failure);
    return { items, page, pageSize, total, summary: counts };
  }
  private body(input: CreateManagedUserInput | UpdateManagedUserInput) {
    return { name: input.name, email: input.email, role: input.role, active: input.active,
      ...(input.profession === undefined ? {} : { profession: input.profession }), ...(input.phone === undefined ? {} : { phone: input.phone }), ...(input.password === undefined ? {} : { password: input.password }) };
  }
  private version(value: string | undefined): string { if (!value) throw new Error('Recarregue a lista antes de editar.'); return value; }
  async createUser(input: CreateManagedUserInput): Promise<ManagedUser> { return user(await this.request('', 'POST', this.body(input))); }
  private async update(id: string, suffix: string, body: unknown): Promise<ManagedUser> { const result = user(await this.request('/' + encodeURIComponent(id) + suffix, 'PATCH', body)); if (result.id !== id) throw new Error(failure); return result; }
  async updateUser(id: string, input: UpdateManagedUserInput, expectedVersion?: string) { return this.update(id, '', { ...this.body(input), expectedVersion: this.version(expectedVersion) }); }
  async updateUserRole(id: string, role: UserRole, expectedVersion?: string) { return this.update(id, '/perfil', { role, expectedVersion: this.version(expectedVersion) }); }
  async updateUserStatus(id: string, active: boolean, expectedVersion?: string) { return this.update(id, '/status', { active, expectedVersion: this.version(expectedVersion) }); }
}
