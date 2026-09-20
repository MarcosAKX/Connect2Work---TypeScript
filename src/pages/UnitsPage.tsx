import { UnitsMap } from '../components/UnitsMap';
import { UnitLocationCard } from '../components/units/UnitLocationCard';
import { NearestUnits } from '../components/units/NearestUnits';
import { useUnits } from '../hooks/useUnits';

export function UnitsPage() {
  const model = useUnits();
  return (
    <main className="units-page units-page--map">
      <header className="units-hero units-hero--map">
        <h1>Escolha sua unidade</h1>
        <p className="units-subtitle">Encontre o espaço mais próximo da sua rotina</p>
      </header>
      <div className="units-explorer">
        <section id="units-list" className="units-list" aria-label="Unidades disponíveis">
          {model.units.map((unit) => (
            <UnitLocationCard
              key={unit.id}
              unit={unit}
              selected={model.selectedUnitId === unit.id}
              nearest={model.nearestUnit?.id === unit.id}
              distance={model.distances.get(unit.id)}
              selectUnit={model.selectUnit}
            />
          ))}
        </section>
        <aside className="units-map" aria-label="Localização das unidades">
          <UnitsMap units={model.units} selectedUnitId={model.selectedUnitId} userPosition={model.userPosition} onSelect={model.selectUnit} />
          <NearestUnits
            nearestUnit={model.nearestUnit}
            sortedUnits={model.sortedUnits}
            distances={model.distances}
            locationState={model.locationState}
            requestLocation={model.requestLocation}
            selectUnit={model.selectUnit}
          />
        </aside>
      </div>
    </main>
  );
}
