import { Link } from 'react-router-dom';
import { ArrowRightIcon, DoorIcon, MapPinIcon } from '../icons';
import type { Unit } from '../../types/domain';

interface UnitLocationCardProps {
  unit: Unit;
  selected: boolean;
  nearest: boolean;
  distance: number | undefined;
  selectUnit(unitId: string): void;
}

export function UnitLocationCard({ unit, selected, nearest, distance, selectUnit }: UnitLocationCardProps) {
  return (
    <article className={`unit-location-card${selected ? ' is-selected' : ''}`} onMouseEnter={() => selectUnit(unit.id)}>
      <button
        type="button"
        className="unit-location-card__select"
        aria-label={`Mostrar ${unit.name} no mapa`}
        onClick={() => selectUnit(unit.id)}
      />
      <div className="unit-location-card__visual">
        {unit.imageUrl
          ? <img src={unit.imageUrl} alt={`Fachada da ${unit.name}`} />
          : <div><span>C2W</span><small>{unit.name}</small></div>}
      </div>
      <div className="unit-location-card__content">
        {nearest && <span className="unit-location-card__badge">Mais próxima</span>}
        <h2>{unit.name}</h2>
        <p className="unit-location-card__address"><MapPinIcon width="17" height="17" />{unit.address}</p>
        {unit.description && <p className="unit-location-card__description">{unit.description}</p>}
        <div className="unit-location-card__availability">
          <DoorIcon width="17" height="17" />
          <span><small>Salas disponíveis</small><strong>{unit.availableRooms} salas disponíveis</strong></span>
          {distance !== undefined && <b>{distance.toFixed(1).replace('.', ',')} km</b>}
        </div>
        <Link to={`/salas?unidade=${encodeURIComponent(unit.id)}`} className="btn btn-primary">
          Ver salas <ArrowRightIcon width="16" height="16" />
        </Link>
      </div>
    </article>
  );
}
