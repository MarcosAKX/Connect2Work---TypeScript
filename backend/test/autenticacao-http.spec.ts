import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApplication } from '../src/application';
import { ServicoCadastro } from '../src/services/servico-cadastro';
import { ServicoAutenticacao } from '../src/services/servico-autenticacao';
import { ServicoSessoes } from '../src/services/servico-sessoes';
import type { SessaoValida } from '../src/repositories/contracts/repositorio-sessoes';
import type { UsuarioPublicoDto } from '../src/dto/usuario-publico.dto';
import { validarConfigAutenticacao } from '../src/config/auth-environment';
const origin = 'http://localhost:5173';
const user: UsuarioPublicoDto = { id: 'user', name: 'Maria Silva', email: 'maria@example.com', profession: 'Designer', phone: '11987654321', role: 'client', active: true, createdAt: new Date().toISOString(), hasHoursPlan: false, hoursBalance: 0 };
async function fixture(https = false) {
  const rows = new Map<string, SessaoValida>();
  const auth = new ServicoAutenticacao({ async buscarCredenciais() { return { usuario: user, senhaHash: 'hash' }; }, async buscarPublico() { return user; } },
    { async verificar(_hash, senha) { return senha === 'abc123'; } },
    new ServicoSessoes({
      async criar(usuarioId, hash, ultimaAtividadeEm, expiraEm, anterior) { if (anterior) rows.delete(anterior.toString('hex')); rows.set(hash.toString('hex'), { usuarioId, ultimaAtividadeEm, expiraEm }); },
      async consultar(hash) { return rows.get(hash.toString('hex')) ?? null; },
      async registrarAtividade(hash, now) { const row = rows.get(hash.toString('hex')); if (row) row.ultimaAtividadeEm = now; return row ?? null; },
      async revogar(hash) { rows.delete(hash.toString('hex')); }
    }), 'dummy');
  const app = await createApplication({ async isReady() { return true; } }, {
    service: new ServicoCadastro({ async criar() {} }, { async gerar() { return 'hash'; } }),
    auth: { service: auth, config: { origins: [origin], https } }
  });
  await app.listen(0, '127.0.0.1');
  return { app, url: await app.getUrl() };
}
const headers = { 'Content-Type': 'application/json', Origin: origin, 'X-C2W-Request': '1' };
test('HTTP login cookie protegido, sessão pública, atividade e logout revogado/idempotente', async () => {
  const { app, url } = await fixture();
  try {
    const login = await fetch(url + '/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: user.email, password: 'abc123' }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie') ?? '';
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Path=\//);
    assert.doesNotMatch(cookie, /Max-Age|Expires|Domain|Secure/);
    const content = await login.text();
    assert.ok(content.includes('idleExpiresAt')); assert.ok(!content.includes('abc123') && !content.includes('"token"'));
    const sessionCookie = cookie.split(';')[0] ?? '';
    const session = await fetch(url + '/auth/session', { headers: { Cookie: sessionCookie } });
    assert.equal(session.status, 200);
    assert.equal(session.headers.get('cache-control'), 'no-store');
    assert.equal((await fetch(url + '/auth/activity', { method: 'POST', headers: { ...headers, Cookie: sessionCookie }, body: '{}' })).status, 200);
    const logout = await fetch(url + '/auth/logout', { method: 'POST', headers: { ...headers, Cookie: sessionCookie }, body: '{}' });
    assert.equal(logout.status, 204); assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0/);
    assert.equal((await fetch(url + '/auth/session', { headers: { Cookie: sessionCookie } })).status, 401);
    assert.equal((await fetch(url + '/auth/logout', { method: 'POST', headers, body: '{}' })).status, 204);
    assert.equal((await fetch(url + '/auth/session', { headers: { Cookie: sessionCookie + '; ' + sessionCookie } })).status, 401);
  } finally { await app.close(); }
});
test('HTTP protege origem, JSON, cabeçalho, tamanho e limites de tentativas', async () => {
  const { app, url } = await fixture();
  try {
    for (const unsafe of [
      { 'Content-Type': 'application/json', 'X-C2W-Request': '1' },
      { ...headers, Origin: 'https://evil.example' },
      { 'Content-Type': 'application/json', Origin: origin },
      { ...headers, 'Content-Type': 'text/plain' }
    ]) assert.equal((await fetch(url + '/auth/login', { method: 'POST', headers: unsafe, body: '{}' })).status, 403);
    assert.equal((await fetch(url + '/AUTH/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    assert.equal((await fetch(url + '/auth/register', { method: 'POST', headers: { ...headers, Origin: 'null' }, body: '{}' })).status, 403);
    assert.equal((await fetch(url + '/auth/login', { method: 'POST', headers, body: JSON.stringify({ junk: 'x'.repeat(9000) }) })).status, 413);
    for (let i = 0; i < 10; i++) assert.equal((await fetch(url + '/auth/login', { method: 'POST', headers, body: '{}' })).status, 401);
    assert.equal((await fetch(url + '/auth/login', { method: 'POST', headers, body: '{}' })).status, 429);
  } finally { await app.close(); }
});
test('HTTPS emite Secure; configuração de produção e origens inseguras falham fechadas', async () => {
  assert.throws(() => validarConfigAutenticacao({ NODE_ENV: 'production' }));
  assert.throws(() => validarConfigAutenticacao({ AUTH_ORIGINS: 'https://evil.example' }));
  assert.throws(() => validarConfigAutenticacao({ AUTH_HTTPS: 'false', AUTH_ORIGINS: 'http://example.com' }));
  const { app, url } = await fixture(true);
  try {
    const response = await fetch(url + '/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: user.email, password: 'abc123' }) });
    assert.match(response.headers.get('set-cookie') ?? '', /Secure/);
  } finally { await app.close(); }
});
