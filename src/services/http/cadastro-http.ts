import type { RegisterInput, User } from '../../types/domain';
import type { AuthGateway } from '../contracts';
const genericError = 'Não foi possível confirmar o cadastro. Tente novamente.';
function publicUser(value: unknown): User {
  if (!value || typeof value !== 'object') throw new Error(genericError);
  if (!('id' in value) || typeof value.id !== 'string' || !value.id
    || !('name' in value) || typeof value.name !== 'string'
    || !('email' in value) || typeof value.email !== 'string'
    || !('profession' in value) || typeof value.profession !== 'string'
    || !('phone' in value) || typeof value.phone !== 'string'
    || !('role' in value) || value.role !== 'client'
    || !('active' in value) || value.active !== true
    || !('createdAt' in value) || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))
    || !('hasHoursPlan' in value) || value.hasHoursPlan !== false
    || !('hoursBalance' in value) || value.hoursBalance !== 0) throw new Error(genericError);
  // Lista explicita: campos extras do servidor nunca entram no modelo da tela.
  return { id: value.id, name: value.name, email: value.email, profession: value.profession, phone: value.phone, role: value.role, active: value.active, createdAt: value.createdAt, hasHoursPlan: value.hasHoursPlan, hoursBalance: value.hoursBalance };
}
export class CadastroHttpGateway implements Pick<AuthGateway, 'register'> {
  constructor(private readonly fetcher: typeof fetch = (input, init) => fetch(input, init)) {}
  async register(input: RegisterInput): Promise<User> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      let response: Response;
      try {
        response = await this.fetcher('/api/auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-C2W-Request': '1' },
          credentials: 'omit', cache: 'no-store', signal: controller.signal,
          body: JSON.stringify({ name: input.name, email: input.email, profession: input.profession, phone: input.phone, password: input.password })
        });
      } catch { throw new Error(genericError); }

      if (response.status !== 201) {
        const messages: Record<number, string> = {
          400: 'Confira os dados informados para o cadastro.',
          409: 'Não foi possível cadastrar com esse e-mail.',
          429: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
          503: 'Cadastro indisponível no momento. Tente novamente.'
        };
        throw new Error(messages[response.status] ?? genericError);
      }
      try { const body: unknown = await response.json(); return publicUser(body); }
      catch { throw new Error(genericError); }
    } finally { clearTimeout(timeout); }
  }
}