import { randomBytes } from 'node:crypto';
import { ServicoCadastro } from './services/servico-cadastro';
import { ServicoSenha } from './security/servico-senha-argon2';
import { ServicoSessoes } from './services/servico-sessoes';
import { ServicoAutenticacao } from './services/servico-autenticacao';
import { RepositorioUsuariosMysql } from './repositories/mysql/repositorio-usuarios-mysql';
import { RepositorioSessoesMysql } from './repositories/mysql/repositorio-sessoes-mysql';
import { createApplication } from './application';
import { validateEnvironment } from './config/environment';
import { validarConfigAutenticacao } from './config/auth-environment';
import { createDatabasePool, DatabaseService } from './database/database.service';
import { RepositorioUnidadesMysql } from './repositories/mysql/repositorio-unidades-mysql';
import { ServicoUnidades } from './services/servico-unidades';
async function main(): Promise<void> {
  const config = validateEnvironment(process.env);
  const security = validarConfigAutenticacao(process.env);
  const senhas = new ServicoSenha();
  // Hash fictício aleatório para verificar também contas inexistentes.
  const ficticio = await senhas.gerar(randomBytes(32).toString('base64url'));
  const database = new DatabaseService(createDatabasePool(config.db));
  const usuarios = new RepositorioUsuariosMysql(config.db);
  const sessoes = new RepositorioSessoesMysql(config.db);
  const unidades = new RepositorioUnidadesMysql(config.db);
  const autenticacao = new ServicoAutenticacao(usuarios, senhas, new ServicoSessoes(sessoes), ficticio);
  const app = await createApplication(database, {
    service: new ServicoCadastro(usuarios, senhas), lifecycle: usuarios,
    auth: { service: autenticacao, config: security, lifecycle: sessoes }
  }, { service: new ServicoUnidades(unidades), auth: autenticacao, https: security.https, lifecycle: unidades });
  app.enableShutdownHooks();
  try { await app.listen(config.port, config.host); }
  catch { await app.close(); throw new Error('Não foi possível iniciar a API local.'); }
  console.info(`API local: http://${config.host}:${config.port}. Acesse /ready para verificar o MySQL.`);
}
void main().catch(() => {
  console.error('Não foi possível iniciar a API. Confira a configuração local e a disponibilidade da porta.');
  process.exitCode = 1;
});
