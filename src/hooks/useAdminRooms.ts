import { useCallback, useEffect, useMemo, useState } from 'react';
import { services } from '../services';
import type { CreateRoomInput, Room, Unit } from '../types/domain';

export interface AdminRoomItem {
  room: Room;
  unitName: string;
  imageCount: number;
}

export function useAdminRooms() {
  const [rooms, setRooms] = useState<AdminRoomItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [mutationError, setMutationError] = useState('');

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError('');
    try {
      const catalogUnits = await services.catalog.getUnits();
      const roomGroups = await Promise.all(catalogUnits.map(({ id }) => services.catalog.getRoomsByUnitId(id)));
      setUnits(catalogUnits);
      setRooms(roomGroups.flatMap((group, index) => group.map((room) => ({
        room,
        unitName: catalogUnits[index]?.name ?? 'Unidade indisponível',
        imageCount: room.imageUrls?.length ?? (room.imageUrl ? 1 : 0),
      }))));
    } catch {
      setError('Não foi possível carregar as salas.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredRooms = useMemo(
    () => selectedUnitId ? rooms.filter(({ room }) => room.unitId === selectedUnitId) : rooms,
    [rooms, selectedUnitId],
  );

  const saveRoom = useCallback(async (input: CreateRoomInput, roomId?: string) => {
    setIsSaving(true);
    setMutationError('');
    try {
      if (roomId) await services.catalog.updateRoom(roomId, input);
      else await services.catalog.createRoom(input);
      await load(false);
      return true;
    } catch (caughtError) {
      setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível salvar a sala.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const deleteRoom = useCallback(async (roomId: string) => {
    setIsSaving(true);
    setMutationError('');
    try {
      await services.catalog.deleteRoom(roomId);
      await load(false);
      return true;
    } catch (caughtError) {
      setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível excluir a sala.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  return {
    rooms,
    filteredRooms,
    units,
    selectedUnitId,
    setSelectedUnitId,
    isLoading,
    isSaving,
    error,
    mutationError,
    clearMutationError: () => setMutationError(''),
    reload: load,
    saveRoom,
    deleteRoom,
  };
}
