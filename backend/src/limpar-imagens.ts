import { validateEnvironment } from './config/environment';
import { validarConfigCloudinary } from './config/cloudinary-environment';
import { CloudinaryImagens } from './storage/cloudinary-imagens';
import { RepositorioArquivosImagensMysql } from './repositories/mysql/repositorio-arquivos-imagens-mysql';
import { LimpezaImagens } from './services/limpeza-imagens';
// Mesmas regras de lease, referências e carência do worker; nunca uma exclusão em massa do storage.
async function main(): Promise<void> {
  const config = validateEnvironment(process.env); const cloud = validarConfigCloudinary(process.env);
  const repo = new RepositorioArquivosImagensMysql(config.db, cloud.namespace); const worker = new LimpezaImagens(repo, new CloudinaryImagens(cloud));
  try { await worker.executarLote(20); console.info('Lote de manutenção processado. Falhas individuais permanecem registradas para retentativa.'); }
  finally { await worker.onModuleDestroy(); await repo.onModuleDestroy(); }
}
void main().catch(() => { console.error('Não foi possível processar a manutenção das imagens. Confira banco e armazenamento.'); process.exitCode = 1; });
