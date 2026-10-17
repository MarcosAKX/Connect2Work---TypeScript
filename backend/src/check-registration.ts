// Teste explicito: cria somente um usuario ficticio com UUID aleatorio e o remove em finally.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPool, type RowDataPacket } from 'mysql2/promise';
import { verify } from 'argon2';
import { createApplication } from './application';
import { validateEnvironment } from './config/environment';
import { buildPoolOptions } from './database/database.service';
import { RepositorioUsuariosMysql } from './repositories/mysql/repositorio-usuarios-mysql';
import { ServicoCadastro } from './services/servico-cadastro';
import { ServicoSenha } from './security/servico-senha-argon2';
interface UsuarioTeste extends RowDataPacket { id: string; senha_hash: string; codigo: string; }
async function check(): Promise<void> {
  const config = validateEnvironment(process.env);
  const pool = createPool(buildPoolOptions(config.db));
  const repository = new RepositorioUsuariosMysql(config.db);
  const app = await createApplication({ async isReady() { return true; } }, { service: new ServicoCadastro(repository, new ServicoSenha()), lifecycle: repository });
  const email = `teste-cadastro-${randomUUID()}@example.invalid`;
  const password = randomUUID();
  let createdId: string | undefined;
  try {
    await app.listen(0, '127.0.0.1');
    const url = process.env.REGISTRATION_TEST_PROXY === 'true' ? 'http://127.0.0.1:5173/api' : await app.getUrl();
    const input = { name: 'Teste Cadastro', email, password, profession: 'Teste', phone: '11987654321' };
    const request = () => fetch(`${url}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-C2W-Request': '1', Origin: 'http://127.0.0.1:5173' }, body: JSON.stringify(input) });
    const response = await request();
    assert.equal(response.status, 201, 'Cadastro HTTP nao confirmado');
    const [rows] = await pool.execute<UsuarioTeste[]>('SELECT u.id, u.senha_hash, p.codigo FROM usuarios u JOIN perfis p ON p.id = u.perfil_id WHERE u.email = ?', [email]);
    const user = rows[0];
    assert.ok(user, 'Usuario de teste nao encontrado');
    createdId = user.id;
    assert.equal(user.codigo, 'client');
    assert.equal(await verify(user.senha_hash, password), true);
    const text = await response.text();
    assert.ok(!text.includes(password) && !text.includes(user.senha_hash));
    assert.equal((await request()).status, 409, 'Duplicata nao rejeitada');
    console.info('Cadastro HTTP/MySQL validado: hash, perfil client e duplicata.');
  } finally {
    try {
      // Caso a resposta se perca, o email aleatorio ainda identifica somente nossa fixture.
      if (createdId) await pool.execute('DELETE FROM usuarios WHERE id = ? AND email = ?', [createdId, email]);
      else await pool.execute('DELETE FROM usuarios WHERE email = ?', [email]);
    } finally { await app.close(); await pool.end(); }
  }
}
void check().catch(() => { console.error('Teste real de cadastro falhou; detalhes privados omitidos.'); process.exitCode = 1; });