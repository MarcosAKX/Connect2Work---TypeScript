import { Link } from 'react-router-dom';
import { ArrowRightIcon, MapPinIcon } from '../icons';
import type { UnitsViewModel } from '../../hooks/useUnits';

type NearestUnitsProps = Pick<UnitsViewModel,
  'nearestUnit' | 'sortedUnits' | 'distances' | 'locationState' | 'requestLocation' | 'selectUnit'
>;

export function NearestUnits({
  nearestUnit, sortedUnits, distances, locationState, requestLocation, selectUnit,
}: NearestUnitsProps) {
  return (
    <section className="units-nearest" aria-live="polite">
      <header><h2>Mais próxima de você</h2><MapPinIcon width="18" height="18" /></header>
      {nearestUnit ? (
        <div className="units-nearest__list">
          {sortedUnits.map((unit) => (
            <button type="button" key={unit.id} onClick={() => selectUnit(unit.id)}>
              <span>C2W</span>
              <span><strong>{unit.name}</strong><small>{unit.address}</small></span>
              <b>{distances.get(unit.id)?.toFixed(1).replace('.', ',')} km</b>
            </button>
          ))}
        </div>
      ) : (
        <div className="units-nearest__permission">
          <p>{locationState === 'denied'
            ? 'Localização bloqueada. Libere a permissão no navegador para calcular distâncias.'
            : locationState === 'unavailable'
              ? 'Não foi possível obter sua localização agora.'
              : 'Use sua localização para descobrir a unidade mais próxima.'}</p>
          <button type="button" onClick={requestLocation} disabled={locationState === 'loading'}>
            {locationState === 'loading' ? 'Localizando…' : 'Usar minha localização'}
          </button>
        </div>
      )}
      <Link to="#units-list" onClick={() => document.querySelector('.units-list')?.scrollIntoView({ behavior: 'smooth' })}>
        Ver todas as unidades <ArrowRightIcon width="15" height="15" />
      </Link>
    </section>
  );
}
