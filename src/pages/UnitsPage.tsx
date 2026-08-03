import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, DoorIcon, MapPinIcon } from '../components/icons';
import { UnitsMap } from '../components/UnitsMap';
import { services } from '../services';
import type { Unit } from '../types/domain';

interface Coordinates { latitude: number; longitude: number }

function distanceInKm(origin: Coordinates, destination: Coordinates) {
  const radius = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(destination.latitude - origin.latitude);
  const longitudeDelta = radians(destination.longitude - origin.longitude);
  const firstLatitude = radians(origin.latitude);
  const secondLatitude = radians(destination.latitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'denied' | 'unavailable'>('idle');

  useEffect(() => { void services.catalog.getUnits().then((items) => { setUnits(items); setSelectedUnitId(items[0]?.id ?? null); }); }, []);
  const selectUnit = useCallback((unitId: string) => setSelectedUnitId(unitId), []);
  const distances = useMemo(() => new Map(units.flatMap((unit) =>
    userPosition && typeof unit.latitude === 'number' && typeof unit.longitude === 'number'
      ? [[unit.id, distanceInKm(userPosition, { latitude: unit.latitude, longitude: unit.longitude })] as const]
      : [],
  )), [units, userPosition]);
  const nearestUnit = useMemo(() => [...units].filter(({ id }) => distances.has(id)).sort((first, second) => (distances.get(first.id) ?? Infinity) - (distances.get(second.id) ?? Infinity))[0] ?? null, [distances, units]);

  function requestLocation() {
    if (!navigator.geolocation) { setLocationState('unavailable'); return; }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setUserPosition({ latitude: coords.latitude, longitude: coords.longitude }); setLocationState('idle'); },
      (error) => setLocationState(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return <main className="units-page units-page--map">
    <header className="units-hero units-hero--map"><h1>Escolha sua unidade</h1><p className="units-subtitle">Encontre o espaço mais próximo da sua rotina</p></header>
    <div className="units-explorer">
      <section id="units-list" className="units-list" aria-label="Unidades disponíveis">{units.map((unit) => {
        const distance = distances.get(unit.id);
        return <article key={unit.id} className={`unit-location-card${selectedUnitId === unit.id ? ' is-selected' : ''}`} onMouseEnter={() => selectUnit(unit.id)}>
          <button type="button" className="unit-location-card__select" aria-label={`Mostrar ${unit.name} no mapa`} onClick={() => selectUnit(unit.id)} />
          <div className="unit-location-card__visual">{unit.imageUrl ? <img src={unit.imageUrl} alt={`Fachada da ${unit.name}`} /> : <div><span>C2W</span><small>{unit.name}</small></div>}</div>
          <div className="unit-location-card__content">
            {nearestUnit?.id === unit.id && <span className="unit-location-card__badge">Mais próxima</span>}
            <h2>{unit.name}</h2>
            <p className="unit-location-card__address"><MapPinIcon width="17" height="17" />{unit.address}</p>
            {unit.description && <p className="unit-location-card__description">{unit.description}</p>}
            <div className="unit-location-card__availability"><DoorIcon width="17" height="17" /><span><small>Salas disponíveis</small><strong>{unit.availableRooms} salas disponíveis</strong></span>{distance !== undefined && <b>{distance.toFixed(1).replace('.', ',')} km</b>}</div>
            <Link to={`/salas?unidade=${encodeURIComponent(unit.id)}`} className="btn btn-primary">Ver salas <ArrowRightIcon width="16" height="16" /></Link>
          </div>
        </article>;
      })}</section>

      <aside className="units-map" aria-label="Localização das unidades">
        <UnitsMap units={units} selectedUnitId={selectedUnitId} userPosition={userPosition} onSelect={selectUnit} />
        <section className="units-nearest" aria-live="polite">
          <header><h2>Mais próxima de você</h2><MapPinIcon width="18" height="18" /></header>
          {nearestUnit ? <div className="units-nearest__list">{[...units].filter(({ id }) => distances.has(id)).sort((first, second) => (distances.get(first.id) ?? Infinity) - (distances.get(second.id) ?? Infinity)).map((unit) => <button type="button" key={unit.id} onClick={() => selectUnit(unit.id)}><span>C2W</span><span><strong>{unit.name}</strong><small>{unit.address}</small></span><b>{distances.get(unit.id)?.toFixed(1).replace('.', ',')} km</b></button>)}</div> : <div className="units-nearest__permission"><p>{locationState === 'denied' ? 'Localização bloqueada. Libere a permissão no navegador para calcular distâncias.' : locationState === 'unavailable' ? 'Não foi possível obter sua localização agora.' : 'Use sua localização para descobrir a unidade mais próxima.'}</p><button type="button" onClick={requestLocation} disabled={locationState === 'loading'}>{locationState === 'loading' ? 'Localizando…' : 'Usar minha localização'}</button></div>}
          <Link to="#units-list" onClick={() => document.querySelector('.units-list')?.scrollIntoView({ behavior: 'smooth' })}>Ver todas as unidades <ArrowRightIcon width="15" height="15" /></Link>
        </section>
      </aside>
    </div>
  </main>;
}
