import { createPool, type RowDataPacket } from 'mysql2/promise';
import { validateEnvironment } from './config/environment';
import { buildPoolOptions } from './infrastructure/database/database.service';
interface Probe extends RowDataPacket { account: string; decimal_value: string; }
async function check(): Promise<void> {
  const config = validateEnvironment(process.env);
  const pool = createPool(buildPoolOptions(config.db));
  try {
    const connection = await pool.getConnection();
    try {
      await connection.execute({ sql: "SET time_zone = '+00:00'", timeout: 2000 });
      const [rows] = await connection.execute<Probe[]>({ sql: 'SELECT CURRENT_USER() AS account, CAST(0.10 AS DECIMAL(12,2)) AS decimal_value', timeout: 2000 });
      const result = rows[0];
      if (!result || result.account !== 'c2w_api@localhost' || result.decimal_value !== '0.10') throw new Error('Validação inesperada.');
      // Consulta parametrizada, somente leitura e sem dados pessoais.
      await connection.execute({ sql: 'SELECT id FROM perfis WHERE codigo = ?', timeout: 2000 }, ['client']);
      console.info('Conexão MySQL validada: conta da API, decimal exato e leitura parametrizada.');
    } finally { connection.release(); }
  } finally { await pool.end(); }
}
void check().catch(() => {
  console.error('Conexão não validada. Confira serviço MySQL e configurações locais; detalhes privados foram omitidos.');
  process.exitCode = 1;
});