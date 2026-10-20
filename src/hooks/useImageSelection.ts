import { useEffect, useRef } from 'react';
import { services } from '../services';
import { IMAGE_UPLOAD_LIMIT_BYTES } from '../utils/image-upload';
interface Selection { file?: File; id?: string; expiresAt?: string; }
// Arquivos e previews pertencem ao formulário; somente IDs atravessam o gateway do catálogo.
export function useImageSelection(initial: readonly { id: string; url: string }[]) {
  const entries = useRef(new Map<string, Selection>(initial.map(i => [i.url, { id: i.id }])));
  const alive = useRef(true); const localUrls = useRef(new Set<string>());
  useEffect(() => { alive.current = true; return () => { alive.current = false; for (const url of localUrls.current) URL.revokeObjectURL(url); localUrls.current.clear(); }; }, []);
  function select(file: File): string {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use uma imagem JPEG, PNG ou WebP.');
    if (!file.size || file.size > IMAGE_UPLOAD_LIMIT_BYTES) throw new Error('A imagem deve ter no máximo 10 MiB.');
    const url = URL.createObjectURL(file); localUrls.current.add(url); entries.current.set(url, { file }); return url;
  }
  async function resolve(urls: readonly string[]): Promise<string[]> {
    const gateway = services.images; if (!gateway) throw new Error('Envio de imagens indisponível.'); const ids: string[] = [];
    for (const url of urls) {
      if (!alive.current) throw new Error('Formulário encerrado.'); const entry = entries.current.get(url); if (!entry) throw new Error('Reabra o formulário antes de salvar as imagens.');
      if (entry.file && (!entry.id || entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now())) { const uploaded = await gateway.upload(entry.file); entry.id = uploaded.id; entry.expiresAt = uploaded.expiresAt; }
      if (!alive.current) throw new Error('Formulário encerrado.'); if (!entry.id) throw new Error('Imagem indisponível.'); ids.push(entry.id);
    }
    return ids;
  }
  return { select, resolve, alive };
}
