import { RepositorioAgendamentosMysql } from './repositories/mysql/repositorio-agendamentos-mysql';
import { ServicoAgendamentos } from './services/servico-agendamentos';
import { ServicoAuditoria } from './services/servico-auditoria';
import { RepositorioAuditoriaMysql } from './repositories/mysql/repositorio-auditoria-mysql';
import { RepositorioTarefasMysql } from './repositories/mysql/repositorio-tarefas-mysql';
import { ServicoTarefas } from './services/servico-tarefas';
import { RepositorioAgendamentosAdministrativosMysql } from './repositories/mysql/repositorio-agendamentos-administrativos-mysql';
import { ServicoAgendamentosAdministrativos } from './services/servico-agendamentos-administrativos';
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
import { ServicoSalas } from './services/servico-salas';
import { RepositorioSalasMysql } from './repositories/mysql/repositorio-salas-mysql';
import { RepositorioUsuariosAdministrativosMysql } from './repositories/mysql/repositorio-usuarios-administrativos-mysql';
import { ServicoUsuariosAdministrativos } from './services/servico-usuarios-administrativos';
import { AcessoAdministrativo } from './security/acesso-administrativo';
import { validarConfigCloudinary } from './config/cloudinary-environment';
import { CloudinaryImagens } from './storage/cloudinary-imagens';
import { RepositorioArquivosImagensMysql } from './repositories/mysql/repositorio-arquivos-imagens-mysql';
import { RepositorioCatalogoAdministrativoMysql } from './repositories/mysql/repositorio-catalogo-administrativo-mysql';
import { ServicoImagens } from './services/servico-imagens';
import { ServicoCatalogoAdministrativo } from './services/servico-catalogo-administrativo';
import { LimpezaImagens } from './services/limpeza-imagens';
async function main(): Promise<void> {
  const config = validateEnvironment(process.env);
  const security = validarConfigAutenticacao(process.env);
  const senhas = new ServicoSenha();
  // Hash fictício aleatório para verificar também contas inexistentes.
  const ficticio = await senhas.gerar(randomBytes(32).toString('base64url'));
  const database = new DatabaseService(createDatabasePool(config.db));
  const usuarios = new RepositorioUsuariosMysql(config.db);
  const sessoes = new RepositorioSessoesMysql(config.db);
  const cloudConfig = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_SECRET ? validarConfigCloudinary(process.env) : undefined;
  const storage = cloudConfig ? new CloudinaryImagens(cloudConfig) : undefined;
  const unidades = new RepositorioUnidadesMysql(config.db, storage);
  const salas = new RepositorioSalasMysql(config.db, storage);
  const autenticacao = new ServicoAutenticacao(usuarios, senhas, new ServicoSessoes(sessoes), ficticio);
  const admin = new RepositorioUsuariosAdministrativosMysql(config.db);
  const access = new AcessoAdministrativo(autenticacao);
  const arquivos = cloudConfig ? new RepositorioArquivosImagensMysql(config.db, cloudConfig.namespace) : undefined;
  const catalogoAdmin = storage ? new RepositorioCatalogoAdministrativoMysql(config.db, storage) : undefined;
  const imagens = arquivos && storage ? new ServicoImagens(arquivos, storage, access) : undefined;
  const cleanup = arquivos && storage ? new LimpezaImagens(arquivos, storage) : undefined;
  const tarefas = new RepositorioTarefasMysql(config.db);
  const auditoria = new RepositorioAuditoriaMysql(config.db);
  const clientBookings = new RepositorioAgendamentosMysql(config.db);
  const bookings = new RepositorioAgendamentosAdministrativosMysql(config.db);
  const app = await createApplication(database, {
    service: new ServicoCadastro(usuarios, senhas), lifecycle: usuarios,
    auth: { service: autenticacao, config: security, lifecycle: sessoes }
  }, { service: new ServicoUnidades(unidades), auth: autenticacao, https: security.https, lifecycle: unidades,
    salas: { service: new ServicoSalas(salas), lifecycle: salas } }, {
    service: new ServicoUsuariosAdministrativos(admin, access, senhas), auditoria:{service:new ServicoAuditoria(auditoria,access),lifecycle:auditoria}, tarefas: { service: new ServicoTarefas(tarefas, access), lifecycle: tarefas }, https: security.https, lifecycle: admin,
    ...(catalogoAdmin && imagens && arquivos && cleanup ? { catalogo: { service: new ServicoCatalogoAdministrativo(catalogoAdmin, access, imagens), imagens, acesso: access, lifecycles: [cleanup, catalogoAdmin, arquivos] } } : {})
  }, { service: new ServicoAgendamentosAdministrativos(bookings, access), config: security, lifecycle: bookings }, { service: new ServicoAgendamentos(clientBookings, access), config: security, lifecycle: clientBookings });
  app.enableShutdownHooks();
  try { await app.listen(config.port, config.host); }
  catch { await app.close(); throw new Error('Não foi possível iniciar a API local.'); }
  cleanup?.iniciar();
  console.info(`API local: http://${config.host}:${config.port}. Acesse /ready para verificar o MySQL.`);
}
void main().catch(() => {
  console.error('Não foi possível iniciar a API. Confira a configuração local e a disponibilidade da porta.');
  process.exitCode = 1;
});
