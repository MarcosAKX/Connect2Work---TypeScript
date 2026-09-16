import { useMemo, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, ImageIcon } from '../icons';
import type { Room } from '../../types/domain';
import { getRoomImages } from '../../utils/room-images';

export function RoomGallery({ room }: { room: Room }) {
  const images = useMemo(() => getRoomImages(room), [room]);
  const [imageIndex, setImageIndex] = useState(0);
  return (
    <div
      className="room-gallery"
      aria-label={`Galeria de imagens de ${room.name}`}
    >
      {images[imageIndex] ? (
        <img
          className="room-gallery__image"
          src={images[imageIndex]}
          alt={`${room.name}, imagem ${imageIndex + 1} de ${images.length}`}
        />
      ) : (
        <div className="room-gallery__fallback">
          <ImageIcon width="44" height="44" aria-hidden="true" />
          <span>Fotos em breve</span>
        </div>
      )}
      {images.length > 1 && (
        <>
          <button
            className="room-gallery__arrow room-gallery__arrow--previous"
            type="button"
            aria-label="Imagem anterior"
            onClick={() =>
              setImageIndex((imageIndex - 1 + images.length) % images.length)
            }
          >
            <ArrowLeftIcon width="18" height="18" />
          </button>
          <button
            className="room-gallery__arrow room-gallery__arrow--next"
            type="button"
            aria-label="Próxima imagem"
            onClick={() => setImageIndex((imageIndex + 1) % images.length)}
          >
            <ArrowRightIcon width="18" height="18" />
          </button>
        </>
      )}
      {images.length > 1 && (
        <div className="room-gallery__navigation">
          <span aria-live="polite">
            {imageIndex + 1} / {images.length}
          </span>
          <div
            className="room-gallery__dots"
            aria-label="Navegação das imagens"
          >
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`room-gallery__dot${index === imageIndex ? ' is-active' : ''}`}
                aria-label={`Exibir imagem ${index + 1}`}
                aria-current={index === imageIndex ? 'true' : undefined}
                onClick={() => setImageIndex(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
