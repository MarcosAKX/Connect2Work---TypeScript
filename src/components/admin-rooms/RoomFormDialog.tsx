import { useEffect, useRef, type MouseEvent } from 'react';
import { CloseIcon } from '../icons';
import type { Room, Unit, CreateRoomInput } from '../../types/domain';
import { useRoomForm } from '../../hooks/useRoomForm';
import { RoomImagesField } from './RoomImagesField';
import { RoomAmenitiesField } from './RoomAmenitiesField';

interface RoomFormDialogProps {
  room: Room | null;
  units: Unit[];
  isSaving: boolean;
  gatewayError: string;
  onCancel(): void;
  onSave(input: CreateRoomInput, roomId?: string): Promise<boolean>;
}

export function RoomFormDialog({
  room, units, isSaving, gatewayError, onCancel, onSave,
}: RoomFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const form = useRoomForm({ room, units, onCancel, onSave });
  const {
    name, setName, unitId, setUnitId, capacity, setCapacity,
    price, setPrice, validationError, handleSubmit,
  } = form;

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => dialogRef.current?.close();
  }, []);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget && !isSaving) onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      className="admin-room-modal"
      aria-labelledby="room-form-title"
      onCancel={(event) => { event.preventDefault(); if (!isSaving) onCancel(); }}
      onClick={handleBackdropClick}
    >
      <form className="admin-room-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <header>
          <div>
            <h2 id="room-form-title">{room ? 'Editar Sala' : 'Nova Sala'}</h2>
            <p>{room ? 'Atualize as informações da sala' : 'Cadastre uma nova sala do coworking'}</p>
          </div>
          <button type="button" onClick={onCancel} disabled={isSaving} aria-label="Fechar">
            <CloseIcon width="20" height="20" />
          </button>
        </header>
        <div className="admin-room-form__grid">
          <div className="field">
            <label htmlFor="room-name">Nome da Sala</label>
            <input
              id="room-name" value={name} maxLength={80} autoFocus required
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="room-unit">Unidade</label>
            <select id="room-unit" value={unitId} onChange={(event) => setUnitId(event.target.value)} required>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="room-capacity">Capacidade (pessoas)</label>
            <input
              id="room-capacity" type="number" min="1" step="1" value={capacity}
              onChange={(event) => setCapacity(event.target.value)} required
            />
          </div>
          <div className="field">
            <label htmlFor="room-price">Preço por Hora (R$)</label>
            <input
              id="room-price" type="number" min="0.01" step="0.01" value={price}
              onChange={(event) => setPrice(event.target.value)} required
            />
          </div>
        </div>
        <RoomImagesField
          imageInput={form.imageInput}
          setImageInput={form.setImageInput}
          handleInputKeyDown={form.handleInputKeyDown}
          addImageUrl={form.addImageUrl}
          handleFiles={form.handleFiles}
          images={form.images}
          setImages={form.setImages}
        />
        <RoomAmenitiesField
          amenityInput={form.amenityInput}
          setAmenityInput={form.setAmenityInput}
          handleInputKeyDown={form.handleInputKeyDown}
          addAmenity={form.addAmenity}
          amenities={form.amenities}
          setAmenities={form.setAmenities}
        />
        {(validationError || gatewayError) && (
          <p className="admin-room-form__error" role="alert">{validationError || gatewayError}</p>
        )}
        <footer>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Salvando…' : 'Salvar'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
