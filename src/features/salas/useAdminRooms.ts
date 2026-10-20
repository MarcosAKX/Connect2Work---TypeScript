import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { services } from '../../services';
import type { CreateRoomInput, Room, Unit } from '../../types/domain';

export interface AdminRoomItem {
  room: Room;
  unitName: string;
  imageCount: number;
}

export function useAdminRooms() {
  const [rooms, setRooms] = useState<AdminRoomItem[]>([]);
  const [units, setUnits] = useState<Pick<Unit, 'id' | 'name'>[]>([]);
  const [unitSearch, setUnitSearch] = useState(''); const [selectedOption, setSelectedOption] = useState<Pick<Unit, 'id' | 'name'> | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const sequence = useRef(0);

  const load = useCallback(async (showLoading = true) => {
    const request = ++sequence.current;
    if (showLoading) setIsLoading(true);
    setError('');
    try {
      if (services.adminCatalog) { const result = await services.adminCatalog.listRooms({ page, pageSize: 20, ...(selectedUnitId ? { unitId: selectedUnitId } : {}) }); if (request === sequence.current) { setRooms(result.items.map(room => ({ room, unitName: room.unitName ?? '', imageCount: room.imageIds?.length ?? room.images?.length ?? 0 }))); setTotal(result.total); if (!result.items.length && page > 1) setPage(page - 1); } return; }
      const catalogUnits = await services.catalog.getUnits();
      const roomGroups = await Promise.all(catalogUnits.map(({ id }) => services.catalog.getRoomsByUnitId(id)));
      if (request !== sequence.current) return;
      setUnits(catalogUnits);
      setRooms(roomGroups.flatMap((group, index) => group.map((room) => ({
        room,
        unitName: catalogUnits[index]?.name ?? 'Unidade indisponível',
        imageCount: room.imageUrls?.length ?? (room.imageUrl ? 1 : 0),
      }))));
    } catch {
      if (request === sequence.current) setError('Não foi possível carregar as salas.');
    } finally {
      if (request === sequence.current) setIsLoading(false);
    }
  }, [page, selectedUnitId]);
  const latestLoad = useRef(load); useEffect(() => { latestLoad.current = load; }, [load]);

  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);
  useEffect(() => {
    const gateway = services.adminCatalog; if (!gateway) return;
    let active = true;
    const timer = window.setTimeout(() => { void gateway.unitOptions(unitSearch).then(options => { if (active) setUnits(selectedOption && !options.some(option => option.id === selectedOption.id) ? [selectedOption, ...options] : options); }).catch(() => { if (active) setError('Não foi possível carregar as opções de unidade.'); }); }, unitSearch ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [unitSearch, selectedOption]);

  const filteredRooms = useMemo(
    () => selectedUnitId ? rooms.filter(({ room }) => room.unitId === selectedUnitId) : rooms,
    [rooms, selectedUnitId],
  );

  const saveRoom = useCallback(async (input: CreateRoomInput, roomId?: string, version?: string) => {
    setIsSaving(true);
    setMutationError('');
    try {
      if (services.adminCatalog) { if (roomId) await services.adminCatalog.updateRoom(roomId, input, version); else await services.adminCatalog.createRoom(input); }
      else if (roomId) await services.catalog.updateRoom(roomId, input);
      else await services.catalog.createRoom(input);
      await latestLoad.current(false);
      return true;
    } catch (caughtError) {
      setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível salvar a sala.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const deleteRoom = useCallback(async (roomId: string, version?: string) => {
    setIsSaving(true);
    setMutationError('');
    try {
      if (services.adminCatalog) await services.adminCatalog.deleteRoom(roomId, version); else await services.catalog.deleteRoom(roomId);
      await latestLoad.current(false);
      return true;
    } catch (caughtError) {
      setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível excluir a sala.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const data = {
    unitSearch, setUnitSearch, canSearchUnits: Boolean(services.adminCatalog),
    page, setPage, total,
    rooms,
    filteredRooms,
    units,
    selectedUnitId,
    setSelectedUnitId: (id: string) => { setSelectedUnitId(id); setSelectedOption(units.find(unit => unit.id === id) ?? null); setPage(1); },
    isLoading,
    isSaving,
    error,
    mutationError,
    clearMutationError: () => setMutationError(''),
    reload: load,
    saveRoom,
    deleteRoom,
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(''), 5000);
    return () => window.clearTimeout(timer);
  }, [status]);

  function openCreate() {
    data.clearMutationError();
    setEditingRoom(null);
    setFormOpen(true);
  }
  function openEdit(room: Room) {
    data.clearMutationError();
    setEditingRoom(room);
    setFormOpen(true);
  }
  async function save(input: CreateRoomInput, id?: string) {
    const saved = await data.saveRoom(input, id, editingRoom?.version);
    if (saved) setStatus(id ? 'Sala atualizada com sucesso.' : 'Sala criada com sucesso.');
    return saved;
  }
  async function remove() {
    if (!deletingRoom) return;
    if (await data.deleteRoom(deletingRoom.id, deletingRoom.version)) {
      setStatus('Sala excluída com sucesso.');
      setDeletingRoom(null);
    }
  }
  function closeForm() {
    setFormOpen(false);
    data.clearMutationError();
  }
  function openDelete(room: Room) {
    data.clearMutationError();
    setDeletingRoom(room);
  }
  function closeDelete() {
    setDeletingRoom(null);
    data.clearMutationError();
  }
  return {
    data, formOpen, editingRoom, deletingRoom, status,
    openCreate, openEdit, save, remove, closeForm, openDelete, closeDelete,
  };
}
export type AdminRoomsViewModel = ReturnType<typeof useAdminRooms>;
