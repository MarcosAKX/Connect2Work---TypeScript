import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import type { Room, Unit } from '../../../types/domain';
import { useRooms } from '../useRooms';
const mocks = vi.hoisted(() => ({ unit: vi.fn<(id: string) => Promise<Unit | null>>(), rooms: vi.fn<(id: string) => Promise<Room[]>>() }));
vi.mock('../../../services', () => ({ services: { catalog: { getUnitById: mocks.unit, getRoomsByUnitId: mocks.rooms } } }));
const unit: Unit = { id: 'u1', name: 'Centro', address: 'Rua', imageUrl: null, availableRooms: 0 };
let model: ReturnType<typeof useRooms>;
function Probe({ id }: { id: string | null }) { model = useRooms(id); return <output>{model.unit?.name}</output>; }
describe('Salas ViewModel', () => {
  let root: Root; let container: HTMLDivElement;
  beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); mocks.unit.mockReset().mockResolvedValue(unit); mocks.rooms.mockReset().mockResolvedValue([]); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
  const render = async (id: string | null) => { await act(async () => root.render(<Probe id={id} />)); };
  it('não busca salas sem unidade válida e aceita unidade sem salas', async () => {
    await render(null); expect(model.unit).toBeNull(); expect(mocks.rooms).not.toHaveBeenCalled();
    mocks.unit.mockResolvedValueOnce(null); await render('ausente'); expect(model.unit).toBeNull(); expect(mocks.rooms).not.toHaveBeenCalled();
    await render('u1'); expect(model.rooms).toEqual([]); expect(model.loading).toBe(false);
  });
  it('trata falha com nova tentativa sem detalhes internos', async () => {
    mocks.rooms.mockRejectedValueOnce(new Error('SQL privado'));
    await render('u1'); expect(model.error).toContain('Não foi possível carregar'); expect(model.error).not.toContain('SQL');
    await act(async () => model.reload()); expect(model.error).toBe(''); expect(model.unit?.id).toBe('u1');
  });
  it('ignora resposta atrasada da unidade anterior', async () => {
    let finish: ((rooms: Room[]) => void) | undefined;
    mocks.rooms.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await render('u1'); mocks.unit.mockResolvedValueOnce({ ...unit, id: 'u2', name: 'Segunda' });
    await render('u2'); await act(async () => finish?.([{ id: 'r1', unitId: 'u1', name: 'Antiga', capacity: 1, pricePerHour: 5, amenities: [], imageUrl: null }]));
    expect(model.unit?.id).toBe('u2'); expect(model.rooms).toEqual([]);
  });
});
