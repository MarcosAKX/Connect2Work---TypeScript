import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { ArrowLeftIcon, ArrowRightIcon } from '../components/icons';
import { services } from '../services';
import type { Room, Unit } from '../types/domain';
import { getRoomImages } from '../utils/room-images';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function RoomCard({ room }: { room: Room }) {
  const images = getRoomImages(room);
  const [imageIndex, setImageIndex] = useState(0);
  const bookingUrl = `/agendamento?sala=${encodeURIComponent(room.id)}`;
  const currentImage = images[imageIndex];

  return (
    <article className="room-card card">
      <div className="room-card__visual">
        {currentImage ? <img className="room-card__image" src={currentImage} alt={`${room.name}, imagem ${imageIndex + 1} de ${images.length}`} /> : <span className="room-card__name-fallback">{room.name}</span>}
        <Link className="room-card__visual-link" to={bookingUrl} aria-label={`Ver detalhes e agendar ${room.name}`} />
        <span className="room-card__price">{money.format(room.pricePerHour)}/h</span>
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
      <Link to={bookingUrl} className="room-card__body" aria-label={`Agendar a sala ${room.name}`}>
        <h2 className="room-card__title">{room.name}</h2><p className="room-card__capacity">{room.capacity} pessoas</p><div className="room-card__tags">{room.amenities.slice(0, 3).map((amenity) => <span className="room-card__tag" key={amenity}>{amenity}</span>)}</div>
      </Link>
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
      <article className="unit-summary card" aria-label="Resumo da unidade">
        <div className="unit-summary__info"><h2>{unit.name}</h2><p className="unit-summary__address">⌖ {unit.address}</p></div>
        <span className="unit-summary__badge">{rooms.length} salas disponíveis</span>
      </article>
      <section className="rooms-hero"><h1>Escolha uma <span className="text-accent">Sala</span></h1><p className="rooms-subtitle">Selecione a sala ideal para sua reserva</p></section>
      <section className="rooms-grid" aria-label="Salas disponíveis">
        {rooms.map((room) => <RoomCard key={room.id} room={room} />)}
      </section>
    </main>
  );
}
