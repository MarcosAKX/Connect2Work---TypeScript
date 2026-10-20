import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { ArmazenamentoImagens } from '../../storage/armazenamento-imagens';
export interface ImagemResolvida { id: string; url: string; cardUrl: string; }
interface Linha extends RowDataPacket { id: string; chave_publica: string; versao_cloudinary: string; }
// Somente chaves publicadas e vinculadas são expostas. URLs legadas não são buscadas pelo servidor.
export async function resolverImagens(c: PoolConnection, keys: readonly string[], storage: ArmazenamentoImagens): Promise<Map<string, ImagemResolvida>> {
  const result = new Map<string, ImagemResolvida>();
  const managed = [...new Set(keys.filter(key => !/^(https:\/\/|\/(?!\/))/.test(key)))];
  if (managed.length) {
    const [rows] = await c.execute<Linha[]>({ sql: `SELECT id,chave_publica,versao_cloudinary FROM arquivos_imagens WHERE estado='vinculado' AND versao_cloudinary IS NOT NULL AND chave_publica IN (${managed.map(() => '?').join(',')})`, timeout: 2000 }, managed);
    for (const row of rows) result.set(row.chave_publica, { id: row.id, url: storage.url(row.chave_publica, row.versao_cloudinary, 'galeria'), cardUrl: storage.url(row.chave_publica, row.versao_cloudinary, 'card') });
  }
  return result;
}
