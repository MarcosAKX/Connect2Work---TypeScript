import { useEffect, useState } from 'react';
import { useAdminRooms } from './useAdminRooms';
import type { Room, CreateRoomInput } from '../types/domain';

// Coordenação da página; catálogo e mutações continuam em useAdminRooms.
export function useAdminRoomsPage() {
  const data = useAdminRooms();
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
    const saved = await data.saveRoom(input, id);
    if (saved) setStatus(id ? 'Sala atualizada com sucesso.' : 'Sala criada com sucesso.');
    return saved;
  }
  async function remove() {
    if (!deletingRoom) return;
    if (await data.deleteRoom(deletingRoom.id)) {
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
export type AdminRoomsViewModel = ReturnType<typeof useAdminRoomsPage>;
