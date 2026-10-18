// Integração local isolada: API em porta aleatória e somente fixtures próprias, removidas em finally.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPool } from 'mysql2/promise';
import { createApplication } from './application';
import { validateEnvironment } from './config/environment';
import { buildPoolOptions } from './database/database.service';
import { validarConfigAutenticacao } from './config/auth-environment';
import { RepositorioUsuariosMysql } from './repositories/mysql/repositorio-usuarios-mysql';
import { RepositorioSessoesMysql } from './repositories/mysql/repositorio-sessoes-mysql';
import { RepositorioUnidadesMysql } from './repositories/mysql/repositorio-unidades-mysql';
import { RepositorioSalasMysql } from './repositories/mysql/repositorio-salas-mysql';
import { ServicoCadastro } from './services/servico-cadastro';
import { ServicoAutenticacao } from './services/servico-autenticacao';
import { ServicoSessoes } from './services/servico-sessoes';
import { ServicoUnidades } from './services/servico-unidades';
import { ServicoSalas } from './services/servico-salas';
import { ServicoSenha } from './security/servico-senha-argon2';
async function check(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Somente desenvolvimento local.');
  const config = validateEnvironment(process.env);
  const pool = createPool(buildPoolOptions(config.db));
  const users = new RepositorioUsuariosMysql(config.db); const sessions = new RepositorioSessoesMysql(config.db);
  const units = new RepositorioUnidadesMysql(config.db); const rooms = new RepositorioSalasMysql(config.db);
  const passwords = new ServicoSenha(); const password = randomUUID();
  const auth = new ServicoAutenticacao(users, passwords, new ServicoSessoes(sessions), await passwords.gerar(randomUUID()));
  const app = await createApplication({ async isReady() { return true; } }, {
    service: new ServicoCadastro(users, passwords), lifecycle: users,
    auth: { service: auth, config: validarConfigAutenticacao({}), lifecycle: sessions }
  }, { service: new ServicoUnidades(units), auth, https: false, lifecycle: units, salas: { service: new ServicoSalas(rooms), lifecycle: rooms } });
  const unitA = randomUUID(); const unitB = randomUUID(); const roomA = randomUUID(); const roomB = randomUUID(); const amenity = randomUUID(); const secondAmenity = randomUUID();
  const email = `teste-salas-${randomUUID()}@example.invalid`; const amenityName = 'Teste ' + amenity; const secondAmenityName = 'Teste ' + secondAmenity;
  try {
    await app.listen(0, '127.0.0.1'); const base = await app.getUrl();
    const path = '/unidades/' + unitA + '/salas';
    assert.equal((await fetch(base + path)).status, 401);
    const headers = { 'Content-Type': 'application/json', 'X-C2W-Request': '1', Origin: 'http://127.0.0.1:5173' };
    assert.equal((await fetch(base + '/auth/register', { method: 'POST', headers, body: JSON.stringify({ name: 'Teste Salas', email, password, profession: 'Teste', phone: '11987654321' }) })).status, 201);
    const login = await fetch(base + '/auth/login', { method: 'POST', headers, body: JSON.stringify({ email, password }) }); assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);
    const read = async (url: string): Promise<unknown> => { const response = await fetch(base + url, { headers: { Cookie: cookie } }); assert.equal(response.status, 200); return response.json(); };
    await pool.execute('INSERT INTO unidades (id,nome,endereco) VALUES (?,?,?),(?,?,?)', [unitA, 'Teste Salas A', 'Fictício', unitB, 'Teste Salas B', 'Fictício']);
    assert.deepEqual(await read(path), []);
    await pool.execute('INSERT INTO salas (id,unidade_id,nome,capacidade,preco_por_hora) VALUES (?,?,?,?,?),(?,?,?,?,?)', [roomA, unitA, 'Teste A', 4, '50.25', roomB, unitB, 'Teste B', 2, '0.00']);
    const noAmenities = await read(path); assert.ok(Array.isArray(noAmenities)); assert.equal(noAmenities.length, 1);
    const first: unknown = noAmenities[0]; assert.ok(first && typeof first === 'object' && 'amenities' in first); assert.deepEqual(first.amenities, []);
    await pool.execute('INSERT INTO comodidades (id,nome) VALUES (?,?),(?,?)', [amenity, amenityName, secondAmenity, secondAmenityName]);
    await pool.execute('INSERT INTO sala_comodidades (sala_id,comodidade_id) VALUES (?,?),(?,?),(?,?)', [roomA, amenity, roomA, secondAmenity, roomB, amenity]);
    const rows = await read(path); assert.ok(Array.isArray(rows)); assert.equal(rows.length, 1);
    const detail = await read('/salas/' + roomA);
    assert.deepEqual(detail, { id: roomA, unitId: unitA, name: 'Teste A', capacity: 4, pricePerHour: 50.25, amenities: [amenityName, secondAmenityName].sort(), imageUrl: null });
    assert.deepEqual(rows, [detail]);
    const other = await read('/unidades/' + unitB + '/salas'); assert.ok(Array.isArray(other)); assert.equal(other.length, 1);
    const second: unknown = other[0]; assert.ok(second && typeof second === 'object' && 'id' in second && 'amenities' in second); assert.equal(second.id, roomB); assert.deepEqual(second.amenities, [amenityName]);
    assert.equal((await fetch(base + '/salas/' + unitA, { headers: { Cookie: cookie } })).status, 404);
    assert.equal((await fetch(base + '/unidades/invalido/salas', { headers: { Cookie: cookie } })).status, 400);
    assert.equal((await fetch(base + '/auth/logout', { method: 'POST', headers: { ...headers, Cookie: cookie }, body: '{}' })).status, 204);
    assert.equal((await fetch(base + path, { headers: { Cookie: cookie } })).status, 401);
    console.info('Salas HTTP/MySQL: filtro, vazio, sem comodidades, N:N compartilhado, preço decimal, sessão e logout validados.');
  } finally {
    try {
      await pool.execute('DELETE FROM salas WHERE id IN (?,?) AND unidade_id IN (?,?)', [roomA, roomB, unitA, unitB]);
      await pool.execute('DELETE FROM comodidades WHERE id IN (?,?)', [amenity, secondAmenity]);
      await pool.execute('DELETE FROM unidades WHERE id IN (?,?)', [unitA, unitB]);
      await pool.execute('DELETE s FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE u.email=?', [email]);
      await pool.execute('DELETE FROM usuarios WHERE email=?', [email]);
    } finally { await app.close(); await pool.end(); }
  }
}
void check().catch(() => { console.error('Validação de salas falhou; detalhes privados omitidos.'); process.exitCode = 1; });
