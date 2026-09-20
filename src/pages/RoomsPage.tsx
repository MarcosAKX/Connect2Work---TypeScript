import { Navigate, useSearchParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { MapPinIcon } from '../components/icons';
import { RoomCard } from '../components/rooms/RoomCard';
import { useRooms } from '../hooks/useRooms';

export function RoomsPage() {
  const [params] = useSearchParams();
  const unitId = params.get('unidade');
  const { unit, rooms } = useRooms(unitId);

  if (unit === null) return <Navigate to="/unidades" replace />;
  if (!unit) return <main className="rooms-page"><p>Carregando salas...</p></main>;

  return (
    <main className="rooms-page">
      <BackLink to="/unidades" />
      <header className="rooms-header">
        <h1>Salas disponíveis</h1>
        <div className="unit-summary" aria-label="Unidade selecionada">
          <span className="unit-summary__pin" aria-hidden="true">
            <MapPinIcon width="20" height="20" />
          </span>
          <div className="unit-summary__info">
            <h2>{unit.name}</h2>
            <p className="unit-summary__address">{unit.address}</p>
          </div>
          <span className="unit-summary__badge">{rooms.length} {rooms.length === 1 ? 'sala' : 'salas'}</span>
        </div>
      </header>
      <section className="rooms-grid" aria-label="Salas disponíveis">
        {rooms.length > 0 ? (
          <div className="rooms-columns">
            <div className="rooms-column rooms-column--primary">
              {rooms.filter((_, index) => index % 2 === 0).map((room, index) => (
                <RoomCard key={room.id} room={room} featured={index === 0} />
              ))}
            </div>
            <div className="rooms-column rooms-column--secondary">
              {rooms.filter((_, index) => index % 2 === 1).map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <h2>Nenhuma sala disponível</h2>
            <p>Esta unidade ainda não possui salas cadastradas.</p>
          </div>
        )}
      </section>
    </main>
  );
}
