// Validação local: cria somente fixtures aleatórias próprias e remove em finally.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPool } from 'mysql2/promise';
import { validateEnvironment } from './config/environment';
import { buildPoolOptions } from './database/database.service';
async function check(): Promise<void> {
  const config = validateEnvironment(process.env);
  const pool = createPool(buildPoolOptions(config.db));
  const unitId = randomUUID(); const roomId = randomUUID();
  const email = `teste-unidades-${randomUUID()}@example.invalid`;
  const base = `http://127.0.0.1:${config.port}`;
  const headers = { 'Content-Type': 'application/json', 'X-C2W-Request': '1', Origin: 'http://127.0.0.1:5173' };
  try {
    assert.equal((await fetch(base + '/unidades')).status, 401);
    const password = randomUUID();
    const registered = await fetch(base + '/auth/register', { method: 'POST', headers, body: JSON.stringify({ name: 'Teste Unidades', email, password, profession: 'Teste', phone: '11987654321' }) });
    assert.equal(registered.status, 201);
    const login = await fetch(base + '/auth/login', { method: 'POST', headers, body: JSON.stringify({ email, password }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);
    await pool.execute('INSERT INTO unidades (id,nome,endereco,latitude,longitude) VALUES (?,?,?,?,?)', [unitId, 'Teste Integração Unidades', 'Endereço fictício', '-20.9447000', '-48.4894000']);
    const read = async () => {
      const response = await fetch(base + '/unidades', { headers: { Cookie: cookie } });
      assert.equal(response.status, 200);
      const body: unknown = await response.json(); assert.ok(Array.isArray(body));
      const unit: unknown = body.find((item: unknown) => item && typeof item === 'object' && 'id' in item && item.id === unitId);
      assert.ok(unit && typeof unit === 'object'); return unit;
    };
    const empty = await read(); assert.ok('availableRooms' in empty); assert.equal(empty.availableRooms, 0);
    await pool.execute('INSERT INTO salas (id,unidade_id,nome,capacidade,preco_por_hora) VALUES (?,?,?,?,?)', [roomId, unitId, 'Teste Sala', 4, '50.00']);
    const unit = await read();
    assert.ok('availableRooms' in unit); assert.equal(unit.availableRooms, 1);
    assert.ok('latitude' in unit); assert.equal(unit.latitude, -20.9447);
    assert.ok('imageUrl' in unit); assert.equal(unit.imageUrl, null);
    assert.equal((await fetch(base + '/auth/logout', { method: 'POST', headers: { ...headers, Cookie: cookie }, body: '{}' })).status, 204);
    assert.equal((await fetch(base + '/unidades', { headers: { Cookie: cookie } })).status, 401);
    console.info('Unidades HTTP/MySQL validadas: sessão, JOIN/contagem zero e um, coordenadas e logout.');
  } finally {
    try {
      await pool.execute('DELETE FROM salas WHERE id=? AND unidade_id=?', [roomId, unitId]);
      await pool.execute('DELETE FROM unidades WHERE id=?', [unitId]);
      await pool.execute('DELETE s FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE u.email=?', [email]);
      await pool.execute('DELETE FROM usuarios WHERE email=?', [email]);
    } finally { await pool.end(); }
  }
}
void check().catch(() => { console.error('Validação local de unidades falhou; detalhes privados omitidos.'); process.exitCode = 1; });
