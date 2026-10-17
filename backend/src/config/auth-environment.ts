export interface AuthConfig { readonly origins: readonly string[]; readonly https: boolean; }
export function validarConfigAutenticacao(input: Record<string, string | undefined>): AuthConfig {
  if (input.AUTH_HTTPS !== undefined && input.AUTH_HTTPS !== 'true' && input.AUTH_HTTPS !== 'false') throw new Error('Configuração inválida: AUTH_HTTPS.');
  const https = input.AUTH_HTTPS === 'true';
  if (input.NODE_ENV === 'production' && (!https || !input.AUTH_ORIGINS)) throw new Error('Produção exige HTTPS e origem explícita.');
  const origins = (input.AUTH_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(value => value.trim());
  if (!origins.length || origins.length > 10) throw new Error('Configuração inválida: AUTH_ORIGINS.');
  for (const origin of origins) {
    let url: URL;
    try { url = new URL(origin); } catch { throw new Error('Configuração inválida: AUTH_ORIGINS.'); }
    if (url.origin !== origin || url.username || url.password || !['http:', 'https:'].includes(url.protocol)) throw new Error('Configuração inválida: AUTH_ORIGINS.');
    if (https && url.protocol !== 'https:') throw new Error('HTTPS exige origens HTTPS.');
    if (!https && (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('HTTP permitido apenas no desenvolvimento local.');
  }
  return { origins, https };
}
