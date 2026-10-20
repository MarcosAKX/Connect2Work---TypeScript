import type { AdminCatalogGateway, CatalogPage, CatalogQuery, ImageGateway } from '../contracts';
import type { CreateRoomInput, CreateUnitInput, Room, Unit } from '../../types/domain';
import { parseUnit } from './unidades-http';
import { parseRoom } from './salas-http';
const failure = 'Não foi possível consultar o catálogo. Atualize a lista.';
function object(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(failure); return Object.fromEntries(Object.entries(v)); }
function text(v: unknown): string { if (typeof v !== 'string') throw new Error(failure); return v; }
function version(v: unknown): string { const s = text(v); if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(s)) throw new Error(failure); return s; }
function unit(v: unknown): Unit { const o = object(v); return { ...parseUnit(v), version: version(o.version), imageId: o.imageId === null ? null : text(o.imageId) }; }
function room(v: unknown): Room { const o = object(v); if (!Array.isArray(o.images) || o.images.length > 6 || !Array.isArray(o.imageIds) || o.imageIds.length > 6) throw new Error(failure); const images = o.images.map((v: unknown) => { const i = object(v); const url = text(i.url); if (!/^(https:\/\/|\/(?!\/))/.test(url)) throw new Error(failure); return { id: text(i.id), url }; }); const imageIds = o.imageIds.map((id: unknown) => text(id)); if (new Set(imageIds).size !== imageIds.length || images.some(image => !imageIds.includes(image.id))) throw new Error(failure); return { ...parseRoom(v), version: version(o.version), unitName: text(o.unitName), images, imageIds }; }
export class CatalogoAdminHttpGateway implements AdminCatalogGateway, ImageGateway {
  constructor(private readonly fetcher: typeof fetch = (input, init) => fetch(input, init), private readonly unauthorized: () => void | Promise<unknown> = () => {}) {}
  private async request(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), body instanceof FormData ? 60000 : method === 'GET' ? 10000 : 120000);
    try {
      let response: Response; const multipart = body instanceof FormData;
      try { response = await this.fetcher('/api/admin/' + path, { method, credentials: 'include', cache: 'no-store', signal: controller.signal, headers: { 'X-C2W-Request': '1', ...(multipart ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }) }); }
      catch { throw new Error(method === 'GET' ? failure : 'Não foi possível confirmar o salvamento. Atualize a lista antes de repetir.'); }
      if (response.status === 401) { try { await this.unauthorized(); } catch { /* Mantém mensagem de sessão. */ } throw new Error('Sessão encerrada. Faça login novamente.'); }
      if (response.status === 403) throw new Error('Você não tem permissão para esta operação.');
      if (response.status === 409) throw new Error('Cadastro alterado ou com vínculos existentes. Atualize a lista antes de editar ou excluir.');
      if (response.status === 400) {
        if (multipart) {
          let code: unknown;
          try { const error: unknown = await response.json(); if (error && typeof error === 'object' && 'code' in error) code = error.code; } catch { /* Não exibe conteúdo bruto da resposta. */ }
          if (code === 'IMAGE_PIXEL_LIMIT') throw new Error('A imagem excede 40 megapixels. Reduza a resolução e tente novamente.');
          if (code === 'IMAGE_SIZE_LIMIT') throw new Error('A imagem deve ter no máximo 10 MiB.');
          throw new Error('Não foi possível processar a imagem. Use JPEG, PNG ou WebP válido de até 10 MiB e 40 megapixels.');
        }
        throw new Error('Confira os campos informados.');
      }
      if (response.status === 413) throw new Error('A imagem deve ter no máximo 10 MiB.');
      if (response.status === 429) throw new Error('Muitas solicitações. Aguarde um minuto.');
      if (response.status !== 200 && response.status !== 201) throw new Error(method === 'GET' ? failure : 'Não foi possível confirmar o salvamento. Atualize a lista.');
      const value: unknown = await response.json(); return value;
    } finally { clearTimeout(timeout); }
  }
  private async page<T>(path: string, q: CatalogQuery, parse: (v: unknown) => T): Promise<CatalogPage<T>> {
    const params = new URLSearchParams({ page: String(q.page), pageSize: String(q.pageSize), ...(q.search ? { search: q.search } : {}), ...(q.unitId ? { unitId: q.unitId } : {}) });
    const o = object(await this.request(path + '?' + params));
    if (!Array.isArray(o.items) || typeof o.total !== 'number' || !Number.isSafeInteger(o.total) || o.total < 0 || o.page !== q.page || o.pageSize !== q.pageSize || o.items.length > q.pageSize) throw new Error(failure);
    return { items: o.items.map(parse), total: o.total, page: q.page, pageSize: q.pageSize };
  }
  listUnits(q: CatalogQuery) { return this.page('unidades', q, unit); }
  listRooms(q: CatalogQuery) { return this.page('salas', q, room); }
  async unitOptions(search = '') { const value = await this.request('unidades/opcoes?search=' + encodeURIComponent(search)); if (!Array.isArray(value) || value.length > 100) throw new Error(failure); return value.map((v: unknown) => { const o = object(v); return { id: text(o.id), name: text(o.name) }; }); }
  private unitBody(i: CreateUnitInput) { return { name: i.name, address: i.address, description: i.description ?? '', latitude: i.latitude ?? null, longitude: i.longitude ?? null, ...(i.imageId === undefined ? {} : { imageId: i.imageId }) }; }
  private roomBody(i: CreateRoomInput) { return { name: i.name, unitId: i.unitId, capacity: i.capacity, pricePerHour: i.pricePerHour, amenities: i.amenities, ...(i.imageIds === undefined ? {} : { imageIds: i.imageIds }) }; }
  async createUnit(i: CreateUnitInput) { if (!i.requestId) throw new Error('Reabra o formulário para criar.'); return unit(await this.request('unidades', 'POST', { ...this.unitBody(i), requestId: i.requestId })); }
  async createRoom(i: CreateRoomInput) { if (!i.requestId) throw new Error('Reabra o formulário para criar.'); return room(await this.request('salas', 'POST', { ...this.roomBody(i), requestId: i.requestId })); }
  async updateUnit(id: string, i: CreateUnitInput, expectedVersion?: string) { return unit(await this.request('unidades/' + encodeURIComponent(id), 'PATCH', { ...this.unitBody(i), expectedVersion: version(expectedVersion) })); }
  async updateRoom(id: string, i: CreateRoomInput, expectedVersion?: string) { return room(await this.request('salas/' + encodeURIComponent(id), 'PATCH', { ...this.roomBody(i), expectedVersion: version(expectedVersion) })); }
  async deleteUnit(id: string, expectedVersion?: string) { await this.request('unidades/' + encodeURIComponent(id), 'DELETE', { expectedVersion: version(expectedVersion) }); }
  async deleteRoom(id: string, expectedVersion?: string) { await this.request('salas/' + encodeURIComponent(id), 'DELETE', { expectedVersion: version(expectedVersion) }); }
  async upload(file: File) { const body = new FormData(); body.set('file', file); const o = object(await this.request('imagens', 'POST', body)); const expiresAt = text(o.expiresAt); if (!Number.isFinite(Date.parse(expiresAt))) throw new Error(failure); return { id: text(o.id), expiresAt }; }
}
