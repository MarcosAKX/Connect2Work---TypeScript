// Executar somente localmente. Todos os registros desta verificação são próprios e removidos em finally.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPool, type RowDataPacket } from 'mysql2/promise';
import { createApplication } from './application';
import { validateEnvironment } from './config/environment';
import { buildPoolOptions } from './database/database.service';
import { validarConfigAutenticacao } from './config/auth-environment';
import { RepositorioUsuariosMysql } from './repositories/mysql/repositorio-usuarios-mysql';
import { RepositorioSessoesMysql } from './repositories/mysql/repositorio-sessoes-mysql';
import { RepositorioUsuariosAdministrativosMysql } from './repositories/mysql/repositorio-usuarios-administrativos-mysql';
import { ServicoSenha } from './security/servico-senha-argon2';
import { ServicoSessoes } from './services/servico-sessoes';
import { ServicoCadastro } from './services/servico-cadastro';
import { ServicoAutenticacao } from './services/servico-autenticacao';
import { AcessoAdministrativo } from './security/acesso-administrativo';
import { ServicoUsuariosAdministrativos } from './services/servico-usuarios-administrativos';
function record(value: unknown): Record<string, unknown> { assert.ok(value && typeof value === 'object' && !Array.isArray(value)); return Object.fromEntries(Object.entries(value)); }
async function check(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Somente local.');
  const config = validateEnvironment(process.env); const pool = createPool(buildPoolOptions(config.db));
  const users = new RepositorioUsuariosMysql(config.db); const sessions = new RepositorioSessoesMysql(config.db); const admin = new RepositorioUsuariosAdministrativosMysql(config.db);
  const passwords = new ServicoSenha(); const password = randomUUID(); const hash = await passwords.gerar(password);
  const auth = new ServicoAutenticacao(users, passwords, new ServicoSessoes(sessions), await passwords.gerar(randomUUID()));
  const service = new ServicoUsuariosAdministrativos(admin, new AcessoAdministrativo(auth), passwords);
  const app = await createApplication({ async isReady() { return true; } }, { service: new ServicoCadastro(users, passwords), lifecycle: users, auth: { service: auth, config: validarConfigAutenticacao({}), lifecycle: sessions } }, undefined,
    { service, https: false, lifecycle: admin });
  const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()]; const [a, b, client, secretary, rollbackId, blockedId] = ids;
  assert.ok(a && b && client && secretary && rollbackId && blockedId);
  const createdIds: string[] = [];
  const auditId = randomUUID();
  try {
    for (const { id, role } of [{ id: a, role: 'admin' }, { id: b, role: 'admin' }, { id: client, role: 'client' }, { id: secretary, role: 'secretaria' }]) {
      await pool.execute('INSERT INTO usuarios(id,perfil_id,nome,email,senha_hash,ativo) SELECT ?,id,?,?,?,1 FROM perfis WHERE codigo=?', [id, 'Teste Administrativo', `${id}@example.invalid`, hash, role]);
    }
    await app.listen(0, '127.0.0.1'); const base = await app.getUrl();
    const headers = { 'Content-Type': 'application/json', 'X-C2W-Request': '1', Origin: 'http://127.0.0.1:5173' };
    const login = async (id: string) => {
      const response = await fetch(base + '/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: `${id}@example.invalid`, password }) }); assert.equal(response.status, 200);
      const cookie = response.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie); return cookie;
    };
    const cookieA = await login(a); let cookieB = await login(b); const cookieClient = await login(client); const cookieSecretary = await login(secretary);
    const req = (path: string, cookie: string, method = 'GET', body?: unknown) => fetch(base + path, { method, headers: { ...headers, Cookie: cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const list = async (cookie: string, search: string) => { const response = await req('/admin/usuarios?search=' + encodeURIComponent(search), cookie); assert.equal(response.status, 200); return record(await response.json()); };
    const target = async (cookie: string, id: string) => { const page = await list(cookie, `${id}@example.invalid`); assert.ok(Array.isArray(page.items)); assert.equal(page.items.length, 1); return record(page.items[0]); };
    assert.equal((await fetch(base + '/admin/usuarios')).status, 401);
    assert.equal((await req('/admin/usuarios', cookieClient)).status, 403); assert.equal((await req('/admin/usuarios', cookieSecretary)).status, 403);
    assert.equal((await req('/admin/equipe', cookieSecretary)).status, 200);
    const page = await list(cookieA, `${client}@example.invalid`); assert.equal(page.total, 1); const summary = record(page.summary); assert.ok(Number(summary.total) >= 4); assert.equal(Number(summary.admin) + Number(summary.client) + Number(summary.secretaria), summary.total);
    assert.ok(!JSON.stringify(page).includes('senha_hash')); assert.ok(!JSON.stringify(page).includes(hash));
    const newEmail = `${randomUUID()}@example.invalid`;
    const input = { name: 'Pessoa Teste', email: newEmail, profession: 'Teste', phone: '11987654321', password: 'a'.repeat(130), role: 'client', active: true };
    const create = await req('/admin/usuarios', cookieA, 'POST', input); assert.equal(create.status, 201); const created = record(await create.json()); assert.equal(typeof created.id, 'string'); if (typeof created.id !== 'string') throw new Error('ID inválido'); createdIds.push(created.id);
    const [stored] = await pool.execute<RowDataPacket[]>('SELECT senha_hash FROM usuarios WHERE id=?', [created.id]); assert.equal(typeof stored[0]?.senha_hash, 'string'); assert.ok(await passwords.verificar(stored[0]?.senha_hash, 'a'.repeat(128)));
    assert.equal((await req('/admin/usuarios', cookieA, 'POST', input)).status, 409);
    assert.equal((await req('/admin/usuarios/' + a + '/status', cookieA, 'PATCH', { active: false, expectedVersion: (await target(cookieA, a)).version })).status, 409);
    const changed = await Promise.all(['Primeira Pessoa', 'Segunda Pessoa'].map(name => req('/admin/usuarios/' + created.id, cookieA, 'PATCH', { name, email: newEmail, profession: '', phone: '', role: 'client', active: true, expectedVersion: created.version })));
    assert.deepEqual(changed.map(r => r.status).sort(), [200, 409]);
    const bBefore = await target(cookieA, b);
    assert.equal((await req('/admin/usuarios/' + b, cookieA, 'PATCH', { name: 'Teste Administrativo', email: `${b}@example.invalid`, role: 'admin', active: true, password, expectedVersion: bBefore.version })).status, 200);
    assert.equal((await req('/admin/usuarios', cookieB)).status, 401); cookieB = await login(b);
    // Um pedido que já passou pela autorização inicial precisa revalidar sessão depois da espera por lock.
    const lock = await pool.getConnection();
    try {
      await lock.beginTransaction(); await lock.execute("SELECT id FROM perfis WHERE codigo='admin' FOR UPDATE");
      const pending = req('/admin/usuarios', cookieB, 'POST', { ...input, email: `${blockedId}@example.invalid` });
      await new Promise(resolve => setTimeout(resolve, 200));
      await pool.execute('UPDATE sessoes SET revogado_em=GREATEST(criado_em,UTC_TIMESTAMP(6)) WHERE usuario_id=? AND revogado_em IS NULL', [b]);
      await lock.commit(); assert.equal((await pending).status, 401);
      const [notWritten] = await pool.execute<RowDataPacket[]>('SELECT id FROM usuarios WHERE email=?', [`${blockedId}@example.invalid`]); assert.equal(notWritten.length, 0);
    } finally { await lock.rollback(); lock.release(); }
    cookieB = await login(b);
    await pool.execute('INSERT INTO registros_auditoria(id,acao,entidade,entidade_id) VALUES(?,?,?,?)', [auditId, 'create', 'user', rollbackId]);
    const failingRepo = new RepositorioUsuariosAdministrativosMysql(config.db, undefined, () => auditId);
    try {
      const actor = await new AcessoAdministrativo(auth).exigir(cookieA.slice('c2w_session='.length));
      await assert.rejects(failingRepo.gravar(actor, { kind: 'create', id: rollbackId, data: { name: 'Rollback Teste', email: `${rollbackId}@example.invalid`, profession: '', phone: '', role: 'client', active: true, senhaHash: hash } }));
      const [after] = await pool.execute<RowDataPacket[]>('SELECT id FROM usuarios WHERE id=?', [rollbackId]); assert.equal(after.length, 0);
    } finally { await failingRepo.onModuleDestroy(); }
    const [versionA, versionB] = await Promise.all([target(cookieA, a), target(cookieB, b)]);
    const simultaneous = await Promise.all([req('/admin/usuarios/' + b + '/status', cookieA, 'PATCH', { active: false, expectedVersion: versionB.version }), req('/admin/usuarios/' + a + '/status', cookieB, 'PATCH', { active: false, expectedVersion: versionA.version })]);
    assert.deepEqual(simultaneous.map(r => r.status).sort(), [200, 401]);
    // Login que verificou a senha antiga não pode criar sessão após a redefinição.
    let liberarLogin: (() => void) | undefined; let avisarHash: (() => void) | undefined;
    const espera = new Promise<void>(resolve => { liberarLogin = resolve; });
    const iniciouHash = new Promise<void>(resolve => { avisarHash = resolve; });
    const slowAuth = new ServicoAutenticacao(users, { async verificar(oldHash, raw) { const valid = await passwords.verificar(oldHash, raw); avisarHash?.(); await espera; return valid; } }, new ServicoSessoes(sessions), hash);
    const delayedLogin = slowAuth.login({ email: newEmail, password: 'a'.repeat(128) }, null).then(() => 'session-created', () => 'rejected');
    await iniciouHash;
    const currentActorCookie = simultaneous[0]?.status === 200 ? cookieA : cookieB;
    try {
      const targetPage = await list(currentActorCookie, newEmail); assert.ok(Array.isArray(targetPage.items)); assert.equal(targetPage.items.length, 1);
      const currentTarget = record(targetPage.items[0]);
      assert.equal((await req('/admin/usuarios/' + created.id, currentActorCookie, 'PATCH', { name: 'Pessoa Teste', email: newEmail, role: 'client', active: true, password: 'nova12345', expectedVersion: currentTarget.version })).status, 200);
    } finally { liberarLogin?.(); }
    assert.equal(await delayedLogin, 'rejected', 'login antigo não pode criar sessão depois de redefinir senha');
    console.info('Admin usuários HTTP/MySQL: CRUD, permissões, hash, versões concorrentes, revogação, login concorrente, espera por lock e rollback da auditoria confirmados.');
  } finally {
    try {
      for (const id of [...ids, ...createdIds]) { await pool.execute('DELETE FROM registros_auditoria WHERE usuario_id=? OR (entidade=? AND entidade_id=?)', [id, 'user', id]); await pool.execute('DELETE FROM sessoes WHERE usuario_id=?', [id]); await pool.execute('DELETE FROM usuarios WHERE id=?', [id]); }
      await pool.execute('DELETE FROM registros_auditoria WHERE id=?', [auditId]);
    } finally { await app.close(); await pool.end(); }
  }
}
void check().catch(error => { console.error('Verificação admin falhou:', error instanceof assert.AssertionError ? error.message : 'detalhes privados omitidos'); process.exitCode = 1; });
