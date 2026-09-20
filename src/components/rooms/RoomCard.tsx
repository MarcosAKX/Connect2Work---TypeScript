import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon, ImageIcon, UsersIcon } from '../icons';
import type { Room } from '../../types/domain';
import { getRoomImages } from '../../utils/room-images';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function RoomCard({ room, featured = false }: { room: Room; featured?: boolean }) {
  const images = getRoomImages(room);
  const [imageIndex, setImageIndex] = useState(0);
  const bookingUrl = `/agendamento?sala=${encodeURIComponent(room.id)}`;
  const currentImage = images[imageIndex];

  return (
    <article className={`room-card card${featured ? ' room-card--featured' : ''}`}>
      <div className={`room-card__visual${currentImage ? '' : ' room-card__visual--empty'}`}>
        {currentImage ? (
          <img className="room-card__image" src={currentImage} alt={`${room.name}, imagem ${imageIndex + 1} de ${images.length}`} />
        ) : (
          <span className="room-card__empty-gallery">
            <ImageIcon width="44" height="44" aria-hidden="true" />
            <span>Fotos em breve</span>
          </span>
        )}
        <Link className="room-card__visual-link" to={bookingUrl} aria-label={`Ver detalhes e agendar ${room.name}`} />
        {images.length > 1 && (
          <>
            <button
              className="room-card__arrow room-card__arrow--previous"
              type="button"
              aria-label={`Imagem anterior de ${room.name}`}
              onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)}
            >
              <ArrowLeftIcon width="18" height="18" />
            </button>
            <button
              className="room-card__arrow room-card__arrow--next"
              type="button"
              aria-label={`Próxima imagem de ${room.name}`}
              onClick={() => setImageIndex((imageIndex + 1) % images.length)}
            >
              <ArrowRightIcon width="18" height="18" />
            </button>
            <div className="room-card__gallery-navigation">
              <span aria-live="polite">{imageIndex + 1}/{images.length}</span>
              <div className="room-card__dots" aria-label={`Navegação das imagens de ${room.name}`}>
                {images.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`room-card__dot${index === imageIndex ? ' is-active' : ''}`}
                    aria-label={`Exibir imagem ${index + 1} de ${room.name}`}
                    aria-current={index === imageIndex ? 'true' : undefined}
                    onClick={() => setImageIndex(index)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="room-card__body">
        <div className="room-card__details">
          <div className="room-card__heading">
            <h2 className="room-card__title">
              <UsersIcon width="20" height="20" />{room.name}
            </h2>
            <p className="room-card__capacity">{room.capacity} pessoas</p>
          </div>
          <div className="room-card__tags" aria-label={`Comodidades de ${room.name}`}>
            {room.amenities.slice(0, 3).map((amenity) => (
              <span className="room-card__tag" key={amenity}>{amenity}</span>
            ))}
          </div>
        </div>
        <div className="room-card__booking-footer">
          <p className="room-card__hourly-price">
            <strong>{money.format(room.pricePerHour)}</strong><span>/hora</span>
          </p>
          <Link to={bookingUrl} className="room-card__booking-button" aria-label={`Ver horários de ${room.name}`}>
            Ver horários
            <ArrowRightIcon width="17" height="17" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
