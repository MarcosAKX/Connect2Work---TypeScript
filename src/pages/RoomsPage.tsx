import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { services } from '../services';
import type { Room, Unit } from '../types/domain';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function RoomsPage() {
  const [params] = useSearchParams();
  const unitId = params.get('unidade');
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

  if (unit === null) return <Navigate to="/unidades" replace />;
  if (!unit) return <main className="rooms-page"><p>Carregando salas...</p></main>;

  return (
    <main className="rooms-page">
      <BackLink to="/unidades" />
      <article className="unit-summary card" aria-label="Resumo da unidade">
        <div className="unit-summary__info"><h2>{unit.name}</h2><p className="unit-summary__address">⌖ {unit.address}</p></div>
        <span className="unit-summary__badge">{rooms.length} salas disponíveis</span>
      </article>
      <section className="rooms-hero"><h1>Escolha uma <span className="text-accent">Sala</span></h1><p className="rooms-subtitle">Selecione a sala ideal para sua reserva</p></section>
      <section className="rooms-grid" aria-label="Salas disponíveis">
        {rooms.map((room) => (
          <Link key={room.id} to={`/agendamento?sala=${encodeURIComponent(room.id)}`} className="room-card card" aria-label={`Agendar a sala ${room.name}`}>
            <div className="room-card__visual" aria-hidden="true"><span className="room-card__name-fallback">{room.name}</span><span className="room-card__price">{money.format(room.pricePerHour)}/h</span></div>
            <div className="room-card__body"><h2 className="room-card__title">{room.name}</h2><p className="room-card__capacity">{room.capacity} pessoas</p><div className="room-card__tags">{room.amenities.slice(0, 3).map((amenity) => <span className="room-card__tag" key={amenity}>{amenity}</span>)}</div></div>
          </Link>
        ))}
      </section>
    </main>
  );
}
