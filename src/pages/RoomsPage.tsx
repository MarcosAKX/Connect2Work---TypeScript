import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { ArrowLeftIcon, ArrowRightIcon, UsersIcon } from '../components/icons';
import { services } from '../services';
import type { Room, Unit } from '../types/domain';
import { getRoomImages } from '../utils/room-images';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function RoomCard({ room, featured = false }: { room: Room; featured?: boolean }) {
  const images = getRoomImages(room);
  const [imageIndex, setImageIndex] = useState(0);
  const bookingUrl = `/agendamento?sala=${encodeURIComponent(room.id)}`;
  const currentImage = images[imageIndex];

  return (
    <article className={`room-card card${featured ? ' room-card--featured' : ''}`}>
      <div className="room-card__visual">
        {currentImage ? <img className="room-card__image" src={currentImage} alt={`${room.name}, imagem ${imageIndex + 1} de ${images.length}`} /> : <span className="room-card__name-fallback">{room.name}</span>}
        <Link className="room-card__visual-link" to={bookingUrl} aria-label={`Ver detalhes e agendar ${room.name}`} />
        {images.length > 1 && (
          <>
            <button className="room-card__arrow room-card__arrow--previous" type="button" aria-label={`Imagem anterior de ${room.name}`} onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)}><ArrowLeftIcon width="18" height="18" /></button>
            <button className="room-card__arrow room-card__arrow--next" type="button" aria-label={`Próxima imagem de ${room.name}`} onClick={() => setImageIndex((imageIndex + 1) % images.length)}><ArrowRightIcon width="18" height="18" /></button>
            <div className="room-card__gallery-navigation">
              <span aria-live="polite">{imageIndex + 1}/{images.length}</span>
              <div className="room-card__dots" aria-label={`Navegação das imagens de ${room.name}`}>
                {images.map((_, index) => <button key={index} type="button" className={`room-card__dot${index === imageIndex ? ' is-active' : ''}`} aria-label={`Exibir imagem ${index + 1} de ${room.name}`} aria-current={index === imageIndex ? 'true' : undefined} onClick={() => setImageIndex(index)} />)}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="room-card__body">
        <div className="room-card__details">
          <div className="room-card__heading">
            <h2 className="room-card__title"><UsersIcon width="20" height="20" />{room.name}</h2>
            <p className="room-card__capacity">{room.capacity} pessoas</p>
          </div>
          <div className="room-card__tags" aria-label={`Comodidades de ${room.name}`}>
            {room.amenities.slice(0, 3).map((amenity) => <span className="room-card__tag" key={amenity}>{amenity}</span>)}
          </div>
        </div>
        <Link to={bookingUrl} className="room-card__booking-button" aria-label={`Agendar ${room.name} por ${money.format(room.pricePerHour)} por hora`}>
          <strong>{money.format(room.pricePerHour)}/h</strong>
          <ArrowRightIcon width="17" height="17" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

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
      <header className="rooms-header">
        <h1>Salas disponíveis</h1>
        <div className="unit-summary" aria-label="Unidade selecionada">
          <span className="unit-summary__pin" aria-hidden="true">⌖</span>
          <div className="unit-summary__info">
            <h2>{unit.name}</h2>
            <p className="unit-summary__address">{unit.address}</p>
          </div>
          <span className="unit-summary__badge">{rooms.length} {rooms.length === 1 ? 'sala' : 'salas'}</span>
        </div>
      </header>
      <section className="rooms-grid" aria-label="Salas disponíveis">
        {rooms.length > 0
          ? <div className="rooms-columns">
              <div className="rooms-column rooms-column--primary">{rooms.filter((_, index) => index % 2 === 0).map((room, index) => <RoomCard key={room.id} room={room} featured={index === 0} />)}</div>
              <div className="rooms-column rooms-column--secondary">{rooms.filter((_, index) => index % 2 === 1).map((room) => <RoomCard key={room.id} room={room} />)}</div>
            </div>
          : <div className="empty-state"><h2>Nenhuma sala disponível</h2><p>Esta unidade ainda não possui salas cadastradas.</p></div>}
      </section>
    </main>
  );
}
