export interface CabecalhosRequest { headers: Record<string, string | string[] | undefined>; }
export interface RespostaCookie { setHeader(name: string, value: string): void; }
export class CookieSessao {
  constructor(private readonly https: boolean) {}
  ler(request: CabecalhosRequest): string | null {
    const cookie = request.headers.cookie;
    if (typeof cookie !== 'string' || cookie.length > 8192) return null;
    const tokens = cookie.split(';').map(part => part.trim()).filter(part => part.startsWith('c2w_session='));
    if (tokens.length !== 1) return null;
    const token = tokens[0]?.slice('c2w_session='.length);
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }
  definir(response: RespostaCookie, token: string): void {
    response.setHeader('Set-Cookie', 'c2w_session=' + token + '; Path=/; HttpOnly; SameSite=Strict' + (this.https ? '; Secure' : ''));
  }
  limpar(response: RespostaCookie): void {
    response.setHeader('Set-Cookie', 'c2w_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' + (this.https ? '; Secure' : ''));
  }
}
