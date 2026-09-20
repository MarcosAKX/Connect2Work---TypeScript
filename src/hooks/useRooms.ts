import { useEffect, useState } from 'react';
import { services } from '../services';
import type { Room, Unit } from '../types/domain';

export function useRooms(unitId: string | null) {
  const [unit, setUnit] = useState<Unit | null | undefined>(undefined);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (!unitId) {
      setUnit(null);
      return;
    }
    void Promise.all([services.catalog.getUnitById(unitId), services.catalog.getRoomsByUnitId(unitId)]).then(([nextUnit, nextRooms]) => {
      setUnit(nextUnit);
      setRooms(nextRooms);
    });
  }, [unitId]);

  return { unit, rooms };
}
