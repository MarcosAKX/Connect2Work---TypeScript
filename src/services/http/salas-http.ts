import type { CatalogGateway } from '../contracts';
import type { Room } from '../../types/domain';
const failure = 'Não foi possível carregar as salas. Tente novamente.';
export function parseRoom(value: unknown): Room {
  if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string' || !value.id
    || !('unitId' in value) || typeof value.unitId !== 'string' || !value.unitId || !('name' in value) || typeof value.name !== 'string'
    || !('capacity' in value) || typeof value.capacity !== 'number' || !Number.isSafeInteger(value.capacity) || value.capacity <= 0
    || !('pricePerHour' in value) || typeof value.pricePerHour !== 'number' || !Number.isFinite(value.pricePerHour) || value.pricePerHour < 0
    || !('amenities' in value) || !Array.isArray(value.amenities)
    || !('imageUrl' in value) || (value.imageUrl !== null && (typeof value.imageUrl !== 'string' || !/^(https:\/\/|\/(?!\/))/.test(value.imageUrl)))) throw new Error(failure);
  const amenities: string[] = [];
  const values: readonly unknown[] = value.amenities;
  for (const item of values) { if (typeof item !== 'string' || !item.trim()) throw new Error(failure); amenities.push(item); }
  const room: Room = { id: value.id, unitId: value.unitId, name: value.name, capacity: value.capacity, pricePerHour: value.pricePerHour,
    amenities: [...new Set(amenities)], imageUrl: value.imageUrl };
  if ('imageUrls' in value) { if (!Array.isArray(value.imageUrls) || value.imageUrls.length > 6) throw new Error(failure); room.imageUrls = value.imageUrls.map((item: unknown) => { if (typeof item !== 'string' || !/^(https:\/\/|\/(?!\/))/.test(item)) throw new Error(failure); return item; }); }
  if ('imageCardUrls' in value) { if (!Array.isArray(value.imageCardUrls) || value.imageCardUrls.length !== room.imageUrls?.length) throw new Error(failure); room.imageCardUrls = value.imageCardUrls.map((item: unknown) => { if (typeof item !== 'string' || !/^(https:\/\/|\/(?!\/))/.test(item)) throw new Error(failure); return item; }); }
  return room;
}
export class SalasHttpGateway implements Pick<CatalogGateway, 'getRoomsByUnitId' | 'getRoomById'> {
  constructor(private readonly fetcher: typeof fetch = (input, init) => fetch(input, init), private readonly unauthorized: () => void | Promise<unknown> = () => {}) {}
  private async request(path: string): Promise<{ status: number; body: unknown }> {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await this.fetcher('/api/' + path, { credentials: 'include', cache: 'no-store', signal: controller.signal });
      if (response.status === 401) { await this.unauthorized(); throw new Error('Sessão encerrada. Faça login novamente.'); }
      if (response.status === 404) return { status: 404, body: null };
      if (response.status !== 200) throw new Error(failure);
      const body: unknown = await response.json(); return { status: 200, body };
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Sessão encerrada. Faça login novamente.') throw error;
      throw new Error(failure);
    } finally { clearTimeout(timeout); }
  }
  async getRoomsByUnitId(id: string): Promise<Room[]> {
    const response = await this.request('unidades/' + encodeURIComponent(id) + '/salas');
    if (!Array.isArray(response.body)) throw new Error(failure);
    const rooms = response.body.map(parseRoom);
    if (rooms.some(room => room.unitId !== id) || new Set(rooms.map(room => room.id)).size !== rooms.length) throw new Error(failure);
    return rooms;
  }
  async getRoomById(id: string): Promise<Room | null> {
    const response = await this.request('salas/' + encodeURIComponent(id));
    if (response.status === 404) return null;
    const room = parseRoom(response.body); if (room.id !== id) throw new Error(failure); return room;
  }
}
