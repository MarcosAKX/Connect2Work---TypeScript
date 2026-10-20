import { useCallback, useEffect, useRef, useState } from 'react';
import { services } from '../../services';
import type { Room, Unit } from '../../types/domain';

interface RoomsState { unitId: string | null; unit: Unit | null | undefined; rooms: Room[]; loading: boolean; error: string; }
export function useRooms(unitId: string | null) {
  const [state, setState] = useState<RoomsState>({ unitId, unit: undefined, rooms: [], loading: true, error: '' });
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const operation = ++generation.current;
    setState({ unitId, unit: undefined, rooms: [], loading: true, error: '' });
    if (!unitId) { setState({ unitId, unit: null, rooms: [], loading: false, error: '' }); return; }
    try {
      const unit = await services.catalog.getUnitById(unitId);
      if (operation !== generation.current) return;
      const rooms = unit ? await services.catalog.getRoomsByUnitId(unitId) : [];
      if (operation === generation.current) setState({ unitId, unit, rooms, loading: false, error: '' });
    } catch {
      if (operation === generation.current) setState({ unitId, unit: undefined, rooms: [], loading: false, error: 'Não foi possível carregar as salas. Tente novamente.' });
    }
  }, [unitId]);
  useEffect(() => { void reload(); return () => { generation.current++; }; }, [reload]);
  // A troca de URL nunca exibe, nem por um render, as salas da unidade anterior.
  const visible = state.unitId === unitId ? state : { unit: undefined, rooms: [], loading: true, error: '' };
  return { unit: visible.unit, rooms: visible.rooms, loading: visible.loading, error: visible.error, reload };
}
