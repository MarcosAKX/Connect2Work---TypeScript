import type { CatalogGateway } from './contracts';
import type { Unit } from '../types/domain';
const failure = 'Não foi possível carregar as unidades. Tente novamente.';
export function parseUnit(value: unknown): Unit {
  if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string' || !value.id
    || !('name' in value) || typeof value.name !== 'string' || !('address' in value) || typeof value.address !== 'string'
    || !('availableRooms' in value) || typeof value.availableRooms !== 'number' || !Number.isSafeInteger(value.availableRooms) || value.availableRooms < 0
    || !('imageUrl' in value) || (value.imageUrl !== null && (typeof value.imageUrl !== 'string' || !/^(https:\/\/|\/(?!\/))/.test(value.imageUrl)))) throw new Error(failure);
  const unit: Unit = { id: value.id, name: value.name, address: value.address, availableRooms: value.availableRooms, imageUrl: value.imageUrl };
  if ('description' in value) { if (typeof value.description !== 'string') throw new Error(failure); unit.description = value.description; }
  if ('latitude' in value || 'longitude' in value) {
    if (!('latitude' in value) || typeof value.latitude !== 'number' || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90
      || !('longitude' in value) || typeof value.longitude !== 'number' || !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180) throw new Error(failure);
    unit.latitude = value.latitude; unit.longitude = value.longitude;
  }
  return unit;
}
export class UnidadesHttpGateway implements Pick<CatalogGateway, 'getUnits' | 'getUnitById'> {
  constructor(private readonly fetcher: typeof fetch = (input, init) => fetch(input, init), private readonly unauthorized: () => void | Promise<unknown> = () => {}) {}
  async getUnits(): Promise<Unit[]> {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await this.fetcher('/api/unidades', { credentials: 'include', cache: 'no-store', signal: controller.signal });
      if (response.status === 401) {
        // Confirma o estado atual, evitando invalidar um login novo por uma resposta antiga.
        await this.unauthorized();
        throw new Error('Sessão encerrada. Faça login novamente.');
      }
      if (response.status !== 200) throw new Error(failure);
      const body: unknown = await response.json();
      if (!Array.isArray(body)) throw new Error(failure);
      const units = body.map(parseUnit);
      if (new Set(units.map(unit => unit.id)).size !== units.length) throw new Error(failure);
      return units;
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Sessão encerrada. Faça login novamente.') throw error;
      throw new Error(failure);
    } finally { clearTimeout(timeout); }
  }
  async getUnitById(id: string): Promise<Unit | null> { return (await this.getUnits()).find(unit => unit.id === id) ?? null; }
}
