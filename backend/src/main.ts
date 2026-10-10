import { createApplication } from './application';
import { validateEnvironment } from './config/environment';
import { createDatabasePool, DatabaseService } from './infrastructure/database/database.service';
async function main(): Promise<void> {
  const config = validateEnvironment(process.env);
  const database = new DatabaseService(createDatabasePool(config.db));
  const app = await createApplication(database);
  app.enableShutdownHooks();
  try { await app.listen(config.port, config.host); }
  catch { await app.close(); throw new Error('Não foi possível iniciar a API local.'); }
  console.info(`API local: http://${config.host}:${config.port}. Acesse /ready para verificar o MySQL.`);
}
void main().catch(() => {
  console.error('Não foi possível iniciar a API. Confira a configuração local e a disponibilidade da porta.');
  process.exitCode = 1;
});