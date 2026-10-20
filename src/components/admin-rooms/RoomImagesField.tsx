import { useRef } from 'react';
import { CloseIcon, PlusIcon, UploadIcon } from '../icons';
import { MAX_ROOM_IMAGES, type RoomFormViewModel } from '../../hooks/useRoomForm';

type RoomImagesProps = Pick<
  RoomFormViewModel,
  | 'imageInput' | 'setImageInput' | 'handleInputKeyDown' | 'addImageUrl'
  | 'handleFiles' | 'images' | 'setImages' | 'allowImageUrl' | 'hiddenImageCount' | 'removeHiddenImages'
>;

export function RoomImagesField({
  imageInput, setImageInput, handleInputKeyDown, addImageUrl, handleFiles, images, setImages, allowImageUrl, hiddenImageCount, removeHiddenImages,
}: RoomImagesProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="admin-room-form__section">
      <label htmlFor="room-image-url">Imagens <span>(máximo {MAX_ROOM_IMAGES})</span></label>
      {hiddenImageCount > 0 && <p>{hiddenImageCount} imagem(ns) existente(s) sem prévia serão mantidas. <button type="button" onClick={removeHiddenImages}>Remover imagens sem prévia</button></p>}
      <div className="admin-room-form__add-row">
        {allowImageUrl && <><input
          id="room-image-url"
          value={imageInput}
          onChange={(event) => setImageInput(event.target.value)}
          onKeyDown={(event) => handleInputKeyDown(event, addImageUrl)}
          placeholder="/images/sala.jpg ou URL"
        />
        <button type="button" onClick={addImageUrl} aria-label="Adicionar URL">
          <PlusIcon width="18" height="18" />
        </button></>}
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Enviar imagens">
          <UploadIcon width="18" height="18" />
        </button>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => void handleFiles(event)}
        />
      </div>
      {images.length > 0 && (
        <div className="admin-room-form__image-list">
          {images.map((image, index) => (
            <div key={`${image.slice(0, 30)}-${index}`}>
              <img src={image} alt={`Prévia ${index + 1}`} />
              <span>Imagem {index + 1}</span>
              {index > 0 && <button type="button" aria-label={`Mover imagem ${index + 1} para antes`} onClick={() => setImages(current => { const next = [...current]; const item = next[index]; const previous = next[index - 1]; if (item && previous) { next[index - 1] = item; next[index] = previous; } return next; })}>↑</button>}
              <button
                type="button"
                onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                aria-label={`Remover imagem ${index + 1}`}
              >
                <CloseIcon width="14" height="14" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
