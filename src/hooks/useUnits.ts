import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { services } from '../services';
import type { Unit } from '../types/domain';
import { distanceInKm, type Coordinates } from '../utils/coordinates';

export function useUnits() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'denied' | 'unavailable'>('idle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const operation = ++generation.current;
    setLoading(true); setError(''); setUnits([]);
    try {
      const items = await services.catalog.getUnits();
      if (operation !== generation.current) return;
      setUnits(items); setSelectedUnitId(items[0]?.id ?? null);
    } catch {
      if (operation === generation.current) { setSelectedUnitId(null); setError('Não foi possível carregar as unidades. Tente novamente.'); }
    } finally { if (operation === generation.current) setLoading(false); }
  }, []);

  useEffect(() => {
    void reload();
    return () => { generation.current++; };
  }, [reload]);
  const selectUnit = useCallback((unitId: string) => setSelectedUnitId(unitId), []);
  const distances = useMemo(() => new Map(units.flatMap((unit) =>
    userPosition && typeof unit.latitude === 'number' && typeof unit.longitude === 'number'
      ? [[unit.id, distanceInKm(userPosition, { latitude: unit.latitude, longitude: unit.longitude })] as const]
      : [],
  )), [units, userPosition]);
  const sortedUnits = useMemo(() => [...units]
    .filter(({ id }) => distances.has(id))
    .sort((first, second) => (distances.get(first.id) ?? Infinity) - (distances.get(second.id) ?? Infinity)),
  [distances, units]);
  const nearestUnit = sortedUnits[0] ?? null;

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationState('unavailable');
      return;
    }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationState('idle');
      },
      (error) => setLocationState(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return { units, loading, error, reload, selectedUnitId, userPosition, locationState, distances, sortedUnits, nearestUnit, selectUnit, requestLocation };
}

export type UnitsViewModel = ReturnType<typeof useUnits>;
