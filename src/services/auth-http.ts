import type { RegisterInput, User } from '../types/domain';
import type { AuthGateway, AuthSession } from './contracts';
import { CadastroHttpGateway } from './cadastro-http';
function parseSession(value: unknown): AuthSession {
  const invalid = 'Não foi possível verificar a sessão.';
  if (!value || typeof value !== 'object' || !('user' in value) || !('idleExpiresAt' in value) || typeof value.idleExpiresAt !== 'string'
    || !('absoluteExpiresAt' in value) || typeof value.absoluteExpiresAt !== 'string') throw new Error(invalid);
  const user = value.user;
  if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string' || !user.id
    || !('name' in user) || typeof user.name !== 'string' || !('email' in user) || typeof user.email !== 'string'
    || !('profession' in user) || typeof user.profession !== 'string' || !('phone' in user) || typeof user.phone !== 'string'
    || !('role' in user) || (user.role !== 'client' && user.role !== 'admin' && user.role !== 'secretaria')
    || !('active' in user) || user.active !== true || !('createdAt' in user) || typeof user.createdAt !== 'string' || !Number.isFinite(Date.parse(user.createdAt))
    || !('hasHoursPlan' in user) || typeof user.hasHoursPlan !== 'boolean'
    || !('hoursBalance' in user) || typeof user.hoursBalance !== 'number' || !Number.isFinite(user.hoursBalance) || user.hoursBalance < 0) throw new Error(invalid);
  const idle = Date.parse(value.idleExpiresAt); const absolute = Date.parse(value.absoluteExpiresAt);
  if (!Number.isFinite(idle) || !Number.isFinite(absolute) || idle > absolute) throw new Error(invalid);
  return {
    user: { id: user.id, name: user.name, email: user.email, profession: user.profession, phone: user.phone, role: user.role, active: user.active,
      createdAt: user.createdAt, hasHoursPlan: user.hasHoursPlan, hoursBalance: user.hoursBalance },
    idleExpiresAt: value.idleExpiresAt, absoluteExpiresAt: value.absoluteExpiresAt
  };
}
export class AuthHttpGateway implements AuthGateway {
  readonly mode = 'http';
  private session: AuthSession | null = null;
  private generation = 0;
  private queue: Promise<void> = Promise.resolve();
  private readonly expiredListeners = new Set<() => void>();
  private readonly cadastro: CadastroHttpGateway;
  constructor(private readonly fetcher: typeof fetch = (input, init) => fetch(input, init)) { this.cadastro = new CadastroHttpGateway(fetcher); }
  // Serialização também evita que um Set-Cookie tardio sobrescreva logout/login.
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
  private async request(path: string, method: 'GET' | 'POST', message: string, body?: unknown): Promise<{ status: number; body: unknown; clockOffsetMs: number }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await this.fetcher('/api/auth/' + path, {
        method, credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-C2W-Request': '1' },
        ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {})
      });
      const data: unknown = response.status === 200 ? await response.json() : null;
      const serverTime = Date.parse(response.headers.get('date') ?? '');
      return { status: response.status, body: data, clockOffsetMs: Number.isFinite(serverTime) ? Date.now() - serverTime : 0 };
    } catch { throw new Error(message); }
    finally { clearTimeout(timeout); }
  }
  private expire(): void { this.session = null; for (const listener of this.expiredListeners) listener(); }
  onSessionExpired(listener: () => void): () => void {
    this.expiredListeners.add(listener);
    return () => { this.expiredListeners.delete(listener); };
  }
  getCurrentUser(): User | null { return this.session?.user ?? null; }
  async getUserById(id: string): Promise<User | null> {
    const session = await this.restoreSession();
    return session?.user.id === id ? session.user : null;
  }
  async login(email: string, password: string): Promise<User> {
    const generation = ++this.generation;
    return this.serial(async () => {
      const response = await this.request('login', 'POST', 'Não foi possível entrar. Tente novamente.', { email, password });
      if (response.status === 401) throw new Error('Senha incorreta');
      if (response.status === 429) throw new Error('Muitas tentativas. Aguarde um minuto e tente novamente.');
      if (response.status !== 200) throw new Error('Não foi possível entrar. Tente novamente.');
      const session = { ...parseSession(response.body), clockOffsetMs: response.clockOffsetMs };
      if (generation !== this.generation) throw new Error('Operação de acesso cancelada. Tente novamente.');
      this.session = session;
      return session.user;
    });
  }
  async restoreSession(): Promise<AuthSession | null> { return this.readSession('session', 'GET'); }
  // Uma resposta de outro módulo não deve invalidar operações de login/logout pendentes.
  async checkCurrentSession(): Promise<void> {
    return this.serial(async () => {
      const generation = this.generation;
      const response = await this.request('session', 'GET', 'Não foi possível verificar a sessão. Tente novamente.');
      if (generation !== this.generation) return;
      if (response.status === 401) { this.generation++; this.expire(); return; }
      if (response.status !== 200) throw new Error('Não foi possível verificar a sessão. Tente novamente.');
    });
  }
  async recordActivity(): Promise<AuthSession | null> { return this.readSession('activity', 'POST'); }
  private async readSession(path: 'session' | 'activity', method: 'GET' | 'POST'): Promise<AuthSession | null> {
    const generation = ++this.generation;
    return this.serial(async () => {
      const response = await this.request(path, method, 'Não foi possível verificar a sessão. Tente novamente.');
      if (response.status === 401) { if (generation === this.generation) this.expire(); return null; }
      if (response.status !== 200) throw new Error('Não foi possível verificar a sessão. Tente novamente.');
      const session = { ...parseSession(response.body), clockOffsetMs: response.clockOffsetMs };
      if (generation === this.generation) this.session = session;
      return session;
    });
  }
  async register(input: RegisterInput): Promise<User> { return this.cadastro.register(input); }
  async loginWithGoogle(): Promise<User> { throw new Error('Login com Google ainda não está disponível.'); }
  async resetPassword(_email: string): Promise<void> { throw new Error('Recuperação de senha ainda não está disponível.'); }
  async logout(): Promise<void> {
    const generation = ++this.generation;
    return this.serial(async () => {
      const response = await this.request('logout', 'POST', 'Não foi possível encerrar a sessão. Tente novamente.');
      if (response.status !== 204) throw new Error('Não foi possível encerrar a sessão. Tente novamente.');
      if (generation === this.generation) this.session = null;
    });
  }
}
