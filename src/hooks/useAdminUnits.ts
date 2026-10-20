import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const sequence = useRef(0);

  const load = useCallback(async (showLoading = true) => {
    const request = ++sequence.current;
    if (showLoading) setIsLoading(true);
    setError('');
    try {
      if (services.adminCatalog) { const result = await services.adminCatalog.listUnits({ page, pageSize: 20 }); if (request === sequence.current) { setUnits(result.items.map(unit => ({ unit, roomCount: unit.availableRooms }))); setTotal(result.total); if (!result.items.length && page > 1) setPage(page - 1); } return; }
      const catalogUnits = await services.catalog.getUnits();
      const roomGroups = await Promise.all(
        catalogUnits.map(({ id }) => services.catalog.getRoomsByUnitId(id)),
      );
      if (request !== sequence.current) return;
      setUnits(catalogUnits.map((unit, index) => ({
        unit,
        // Decisão provisória: a tabela usa a contagem real de Room para evitar
        // divergência. Para voltar ao valor manual, use unit.availableRooms aqui.
        roomCount: roomGroups[index]?.length ?? 0,
      })));
    } catch {
      if (request === sequence.current) setError('Não foi possível carregar as unidades.');
    } finally {
      if (request === sequence.current) setIsLoading(false);
    }
  }, [page]);
  const latestLoad = useRef(load); useEffect(() => { latestLoad.current = load; }, [load]);

  useEffect(() => {
    void load(); return () => { sequence.current++; };
  }, [load]);

  const saveUnit = useCallback(async (input: CreateUnitInput, unitId?: string, version?: string) => {
    setIsSaving(true);
    setMutationError('');
    try {
      if (services.adminCatalog) { if (unitId) await services.adminCatalog.updateUnit(unitId, input, version); else await services.adminCatalog.createUnit(input); }
      else if (unitId) await services.catalog.updateUnit(unitId, input);
      else await services.catalog.createUnit(input);
      await latestLoad.current(false);
      return true;
    } catch (caughtError) {
      setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível salvar a unidade.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const deleteUnit = useCallback(async (unitId: string, version?: string) => {
    setIsSaving(true);
    setMutationError('');
    try {
      if (services.adminCatalog) await services.adminCatalog.deleteUnit(unitId, version); else await services.catalog.deleteUnit(unitId);
      await latestLoad.current(false);
      return true;
    } catch (caughtError) {
      setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível excluir a unidade.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  return {
    page, setPage, total,
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
