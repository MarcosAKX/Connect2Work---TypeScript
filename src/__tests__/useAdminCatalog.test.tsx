import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogPage } from '../services/contracts';
import type { Room, Unit } from '../types/domain';
import { useAdminUnits } from '../features/unidades/useAdminUnits';
import { useAdminRooms } from '../features/salas/useAdminRooms';
const mocks = vi.hoisted(() => ({ units: vi.fn<() => Promise<CatalogPage<Unit>>>(), rooms: vi.fn<(q: unknown) => Promise<CatalogPage<Room>>>(), options: vi.fn(), updateUnit: vi.fn(), deleteUnit: vi.fn(), updateRoom: vi.fn(), deleteRoom: vi.fn(), legacy: vi.fn() }));
vi.mock('../services', () => ({ services: { adminCatalog: { listUnits: mocks.units, listRooms: mocks.rooms, unitOptions: mocks.options, updateUnit: mocks.updateUnit, deleteUnit: mocks.deleteUnit, updateRoom: mocks.updateRoom, deleteRoom: mocks.deleteRoom }, catalog: { getUnits: mocks.legacy } } }));
const unit: Unit = { id: 'u', name: 'Unidade', address: 'Rua', imageUrl: null, availableRooms: 3, version: 'antiga' };
const room: Room = { id: 's', unitId: 'u', unitName: 'Unidade', name: 'Sala', capacity: 4, pricePerHour: 50, amenities: [], imageUrl: null, version: 'antiga' };
let units: ReturnType<typeof useAdminUnits>; let rooms: ReturnType<typeof useAdminRooms>['data'];
function Units() { units = useAdminUnits(); return null; }
function Rooms() { rooms = useAdminRooms().data; return null; }
let roomsPage: ReturnType<typeof useAdminRooms>;
function RoomPage() { roomsPage = useAdminRooms(); return null; }
describe('Admin catálogo ViewModels', () => {
  let root: Root;
  beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); root = createRoot(document.createElement('div')); mocks.units.mockReset().mockResolvedValue({ items: [unit], page: 1, pageSize: 20, total: 1 }); mocks.rooms.mockReset().mockResolvedValue({ items: [room], page: 1, pageSize: 20, total: 1 }); mocks.options.mockReset().mockResolvedValue([{ id: 'u', name: 'Unidade' }]); mocks.updateUnit.mockReset().mockResolvedValue(unit); mocks.deleteUnit.mockReset().mockResolvedValue(undefined); mocks.updateRoom.mockReset().mockResolvedValue(room); mocks.deleteRoom.mockReset().mockResolvedValue(undefined); mocks.legacy.mockReset(); });
  afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); });
  it('usa contagem agregada e preserva a versão da abertura do formulário e da exclusão', async () => {
    await act(async () => root.render(<Units />)); expect(units.units[0]?.roomCount).toBe(3); expect(mocks.legacy).not.toHaveBeenCalled();
    await act(async () => { units.openEditForm(unit); units.openDelete(unit); });
    mocks.units.mockResolvedValue({ items: [{ ...unit, version: 'nova' }], page: 1, pageSize: 20, total: 1 }); await act(async () => units.reload());
    await act(async () => { await units.handleSave({ name: unit.name, address: unit.address, imageUrl: null }, unit.id); });
    expect(mocks.updateUnit).toHaveBeenCalledWith(unit.id, expect.anything(), 'antiga');
    await act(async () => units.handleDelete()); expect(mocks.deleteUnit).toHaveBeenCalledWith(unit.id, 'antiga');
  });
  it('edição e exclusão de sala preservam a versão aberta após atualizar a lista', async () => {
    await act(async () => root.render(<RoomPage />));
    await act(async () => { roomsPage.openEdit(room); roomsPage.openDelete(room); });
    mocks.rooms.mockResolvedValue({ items: [{ ...room, version: 'nova' }], page: 1, pageSize: 20, total: 1 });
    await act(async () => roomsPage.data.reload());
    await act(async () => { await roomsPage.save({ unitId: room.unitId, name: room.name, capacity: room.capacity, pricePerHour: room.pricePerHour, amenities: [], imageUrl: null }, room.id); });
    expect(mocks.updateRoom).toHaveBeenCalledWith(room.id, expect.anything(), 'antiga');
    await act(async () => roomsPage.remove());
    expect(mocks.deleteRoom).toHaveBeenCalledWith(room.id, 'antiga');
  });
  it('troca rápida de unidade ignora lista antiga e consulta uma página no servidor', async () => {
    let resolve: ((value: CatalogPage<Room>) => void) | undefined;
    mocks.rooms.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    await act(async () => root.render(<Rooms />)); await act(async () => rooms.setSelectedUnitId('u'));
    await act(async () => resolve?.({ items: [{ ...room, name: 'Antiga' }], page: 1, pageSize: 20, total: 1 }));
    expect(rooms.rooms[0]?.room.name).toBe('Sala'); expect(mocks.rooms).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, unitId: 'u' }); expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it('busca opções de unidade no servidor além das primeiras cem', async () => {
    vi.useFakeTimers();
    try { await act(async () => root.render(<Rooms />)); await act(async () => rooms.setUnitSearch('Unidade 101')); await act(async () => vi.advanceTimersByTimeAsync(250)); expect(mocks.options).toHaveBeenLastCalledWith('Unidade 101'); }
    finally { vi.useRealTimers(); }
  });
});
