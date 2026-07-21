import { useCallback, useEffect, useState } from 'react';
import { services } from '../services';
import type { CreateUnitInput, Unit } from '../types/domain';

export interface AdminUnitItem {
  unit: Unit;
  roomCount: number;
}

export function useAdminUnits() {
  const [units, setUnits] = useState<AdminUnitItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [mutationError, setMutationError] = useState('');

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError('');
    try {
      const catalogUnits = await services.catalog.getUnits();
      const roomGroups = await Promise.all(
        catalogUnits.map(({ id }) => services.catalog.getRoomsByUnitId(id)),
      );
      setUnits(catalogUnits.map((unit, index) => ({
        unit,
        // Decisão provisória: a tabela usa a contagem real de Room para evitar
        // divergência. Para voltar ao valor manual, use unit.availableRooms aqui.
        roomCount: roomGroups[index]?.length ?? 0,
      })));
    } catch {
      setError('Não foi possível carregar as unidades.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveUnit = useCallback(async (input: CreateUnitInput, unitId?: string) => {
    setIsSaving(true);
    setMutationError('');
    try {
      if (unitId) await services.catalog.updateUnit(unitId, input);
      else await services.catalog.createUnit(input);
      await load(false);
      return true;
    } catch (caughtError) {
      setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível salvar a unidade.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const deleteUnit = useCallback(async (unitId: string) => {
    setIsSaving(true);
    setMutationError('');
    try {
      await services.catalog.deleteUnit(unitId);
      await load(false);
      return true;
    } catch (caughtError) {
      setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível excluir a unidade.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  return {
    units,
    isLoading,
    isSaving,
    error,
    mutationError,
    clearMutationError: () => setMutationError(''),
    reload: load,
    saveUnit,
    deleteUnit,
  };
}
