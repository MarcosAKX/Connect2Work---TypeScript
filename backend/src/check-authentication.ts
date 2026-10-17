import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createPool, type RowDataPacket } from 'mysql2/promise';
import { validateEnvironment } from './config/environment';
import { validarConfigAutenticacao } from './config/auth-environment';
import { buildPoolOptions } from './database/database.service';
import { createApplication } from './application';
import { ServicoCadastro } from './services/servico-cadastro';
import { ServicoAutenticacao } from './services/servico-autenticacao';
import { ServicoSessoes } from './services/servico-sessoes';
import { ServicoSenha } from './security/servico-senha-argon2';
import { RepositorioUsuariosMysql } from './repositories/mysql/repositorio-usuarios-mysql';
import { RepositorioSessoesMysql } from './repositories/mysql/repositorio-sessoes-mysql';
interface SessaoRow extends RowDataPacket { token_hash: Buffer; criado_em: Date; ultima_atividade_em: Date; expira_em: Date; revogado_em: Date | null; }
async function main(): Promise<void> {
  const config = validateEnvironment(process.env);
  const security = validarConfigAutenticacao(process.env);
  if (security.https) throw new Error('Teste disponível somente em HTTP local.');
  const pool = createPool(buildPoolOptions(config.db));
  const users = new RepositorioUsuariosMysql(config.db);
  const sessions = new RepositorioSessoesMysql(config.db);
  let now = new Date();
  const passwords = new ServicoSenha();
  const service = new ServicoSessoes(sessions, { agora: () => now });
  const app = await createApplication({ async isReady() { return true; } }, {
    service: new ServicoCadastro(users, passwords), lifecycle: users,
    auth: { service: new ServicoAutenticacao(users, passwords, service, await passwords.gerar(randomUUID())), config: security, lifecycle: sessions }
  });
  const email = 'sessao-' + randomUUID() + '@example.invalid';
  const password = 'a'.repeat(128) + randomUUID();
  let userId: string | undefined;
  try {
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    const headers = { Origin: security.origins[0] ?? '', 'X-C2W-Request': '1', 'Content-Type': 'application/json' };
    const cadastro = await fetch(url + '/auth/register', { method: 'POST', headers, body: JSON.stringify({ name: 'Teste Sessao', email, profession: 'Designer', phone: '11987654321', password }) });
    assert.equal(cadastro.status, 201);
    const data: unknown = await cadastro.json();
    assert.ok(data && typeof data === 'object' && 'id' in data && typeof data.id === 'string');
    userId = data.id;
    async function login(): Promise<string> {
      const response = await fetch(url + '/auth/login', { method: 'POST', headers, body: JSON.stringify({ email, password: 'a'.repeat(128) + 'outro-sufixo' }) });
      assert.equal(response.status, 200);
      const content = await response.text();
      assert.ok(!content.includes('senhaHash') && !content.includes('token_hash') && !content.includes('"token"'));
      const cookie = response.headers.get('set-cookie')?.split(';')[0];
      assert.ok(cookie);
      return cookie;
    }
    async function get(cookie: string) { return fetch(url + '/auth/session', { headers: { Cookie: cookie } }); }
    async function activity(cookie: string) { return fetch(url + '/auth/activity', { method: 'POST', headers: { ...headers, Cookie: cookie }, body: '{}' }); }
    const cookie = await login();
    const token = cookie.slice('c2w_session='.length);
    const hash = createHash('sha256').update(token).digest();
    const [rows] = await pool.execute<SessaoRow[]>('SELECT token_hash, criado_em, ultima_atividade_em, expira_em, revogado_em FROM sessoes WHERE usuario_id = ?', [userId]);
    assert.equal(rows.length, 1);
    const row = rows[0]; assert.ok(row); assert.deepEqual(row.token_hash, hash);
    assert.equal(row.expira_em.getTime() - row.criado_em.getTime(), 14400000);
    assert.equal((await get(cookie)).status, 200);
    const initial = now.getTime();
    now = new Date(initial + 899999); assert.equal((await get(cookie)).status, 200);
    now = new Date(initial + 900000); assert.equal((await get(cookie)).status, 401);
    assert.equal((await activity(cookie)).status, 401);
    now = new Date(initial);
    const active = await login();
    for (let elapsed = 600000; elapsed < 14400000; elapsed += 600000) {
      now = new Date(initial + elapsed); assert.equal((await activity(active)).status, 200);
    }
    now = new Date(initial + 14400000); assert.equal((await activity(active)).status, 401);
    now = new Date(initial);
    const third = await login();
    await pool.execute("UPDATE usuarios SET perfil_id = (SELECT id FROM perfis WHERE codigo = 'secretaria') WHERE id = ?", [userId]);
    const updated: unknown = await (await get(third)).json();
    assert.ok(updated && typeof updated === 'object' && 'user' in updated && updated.user && typeof updated.user === 'object' && 'role' in updated.user && updated.user.role === 'secretaria');
    await pool.execute('UPDATE usuarios SET ativo = 0 WHERE id = ?', [userId]);
    assert.equal((await get(third)).status, 401);
    await pool.execute('UPDATE usuarios SET ativo = 1 WHERE id = ?', [userId]);
    assert.equal((await get(third)).status, 401);
    const fourth = await login();
    const fourthHash = createHash('sha256').update(fourth.slice('c2w_session='.length)).digest();
    await Promise.all([sessions.registrarAtividade(fourthHash, now), sessions.revogar(fourthHash, now)]);
    assert.equal((await get(fourth)).status, 401);
    const fifth = await login();
    const logout = await fetch(url + '/auth/logout', { method: 'POST', headers: { ...headers, Cookie: fifth }, body: '{}' });
    assert.equal(logout.status, 204);
    assert.equal((await get(fifth)).status, 401);
    console.info('PASS: login/MySQL, hash do token, truncamento, limites 15min/4h, perfil, inativação, concorrência e logout.');
  } finally {
    try {
      // Somente fixture aleatória deste processo; nunca usuários já existentes.
      if (userId) {
        await pool.execute('DELETE FROM sessoes WHERE usuario_id = ?', [userId]);
        await pool.execute('DELETE FROM usuarios WHERE id = ? AND email = ?', [userId, email]);
      } else {
        await pool.execute('DELETE FROM usuarios WHERE email = ?', [email]);
      }
    } finally { await pool.end(); await app.close(); }
  }
}
void main().catch(() => { console.error('Falha no teste de autenticação local. Confira migrações, configuração e disponibilidade do MySQL.'); process.exitCode = 1; });
