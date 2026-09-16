import { CloseIcon, PlusIcon } from '../icons';
import type { RoomFormViewModel } from '../../hooks/useRoomForm';

const AMENITY_SUGGESTIONS = [
  'Wi-Fi', 'Ar Condicionado', 'TV', 'Projetor', 'Quadro Branco', 'Videoconferência', 'Café', 'Copa',
];
type RoomAmenitiesProps = Pick<
  RoomFormViewModel,
  'amenityInput' | 'setAmenityInput' | 'handleInputKeyDown' | 'addAmenity' | 'amenities' | 'setAmenities'
>;

export function RoomAmenitiesField({
  amenityInput, setAmenityInput, handleInputKeyDown, addAmenity, amenities, setAmenities,
}: RoomAmenitiesProps) {
  return (
    <div className="admin-room-form__section">
      <label htmlFor="room-amenity">Comodidades</label>
      <div className="admin-room-form__add-row">
        <input
          id="room-amenity"
          value={amenityInput}
          onChange={(event) => setAmenityInput(event.target.value)}
          onKeyDown={(event) => handleInputKeyDown(event, () => addAmenity())}
          placeholder="Ex.: TV 55 polegadas"
        />
        <button type="button" onClick={() => addAmenity()} aria-label="Adicionar comodidade">
          <PlusIcon width="18" height="18" />
        </button>
      </div>
      {amenities.length > 0 && (
        <div className="admin-room-form__tags">
          {amenities.map((amenity) => (
            <button
              type="button"
              key={amenity}
              onClick={() => setAmenities((current) => current.filter((item) => item !== amenity))}
            >
              {amenity}<CloseIcon width="12" height="12" />
            </button>
          ))}
        </div>
      )}
      <p className="admin-room-form__suggestions-label">Sugestões:</p>
      <div className="admin-room-form__suggestions">
        {AMENITY_SUGGESTIONS.filter((suggestion) => !amenities.includes(suggestion)).map((suggestion) => (
          <button type="button" key={suggestion} onClick={() => addAmenity(suggestion)}>+ {suggestion}</button>
        ))}
      </div>
    </div>
  );
}
