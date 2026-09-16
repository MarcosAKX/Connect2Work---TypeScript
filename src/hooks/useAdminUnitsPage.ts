import { useEffect, useState } from 'react';
import { useAdminUnits } from './useAdminUnits';
import type { CreateUnitInput, Unit } from '../types/domain';

export function useAdminUnitsPage() {
  const { units, isLoading, isSaving, error, mutationError, clearMutationError, reload, saveUnit, deleteUnit } = useAdminUnits();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(''), 5000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  function openCreateForm() {
    clearMutationError();
    setEditingUnit(null);
    setIsFormOpen(true);
  }

  function openEditForm(unit: Unit) {
    clearMutationError();
    setEditingUnit(unit);
    setIsFormOpen(true);
  }

  async function handleSave(input: CreateUnitInput, unitId?: string) {
    const saved = await saveUnit(input, unitId);
    if (saved) setStatusMessage(unitId ? 'Unidade atualizada com sucesso.' : 'Unidade criada com sucesso.');
    return saved;
  }

  async function handleDelete() {
    if (!deletingUnit) return;
    const deleted = await deleteUnit(deletingUnit.id);
    if (deleted) {
      setStatusMessage('Unidade excluída com sucesso.');
      setDeletingUnit(null);
    }
  }

  function closeForm() {
    setIsFormOpen(false);
    clearMutationError();
  }
  function openDelete(unit: Unit) {
    clearMutationError();
    setDeletingUnit(unit);
  }
  function closeDelete() {
    setDeletingUnit(null);
    clearMutationError();
  }
  return {
    units, isLoading, isSaving, error, mutationError, reload,
    isFormOpen, editingUnit, deletingUnit, statusMessage,
    openCreateForm, openEditForm, handleSave, handleDelete,
    closeForm, openDelete, closeDelete,
  };
}
export type AdminUnitsViewModel = ReturnType<typeof useAdminUnitsPage>;
