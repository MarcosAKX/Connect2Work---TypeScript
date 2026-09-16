import { useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import type { CreateRoomInput, Room, Unit } from '../types/domain';
import { prepareImageUpload } from '../utils/image-upload';

export const MAX_ROOM_IMAGES = 6;
interface RoomFormOptions {
  room: Room | null;
  units: Unit[];
  onCancel(): void;
  onSave(input: CreateRoomInput, roomId?: string): Promise<boolean>;
}
export function useRoomForm({ room, units, onCancel, onSave }: RoomFormOptions) {
  const [name, setName] = useState(room?.name ?? '');
  const [unitId, setUnitId] = useState(room?.unitId ?? units[0]?.id ?? '');
  const [capacity, setCapacity] = useState(String(room?.capacity ?? ''));
  const [price, setPrice] = useState(String(room?.pricePerHour ?? ''));
  const [images, setImages] = useState<string[]>(room?.imageUrls?.length ? room.imageUrls : room?.imageUrl ? [room.imageUrl] : []);
  const [imageInput, setImageInput] = useState('');
  const [amenities, setAmenities] = useState<string[]>(room?.amenities ?? []);
  const [amenityInput, setAmenityInput] = useState('');
  const [validationError, setValidationError] = useState('');


  function addImageUrl() {
    const value = imageInput.trim();
    if (!value) return;
    if (images.length >= MAX_ROOM_IMAGES) return setValidationError(`Adicione no máximo ${MAX_ROOM_IMAGES} imagens.`);
    if (!(value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image/'))) {
      return setValidationError('Use uma URL válida ou um caminho iniciado por /.');
    }
    if (!images.includes(value)) setImages((current) => [...current, value]);
    setImageInput('');
    setValidationError('');
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (images.length + files.length > MAX_ROOM_IMAGES) {
      setValidationError(`Adicione no máximo ${MAX_ROOM_IMAGES} imagens.`);
      event.target.value = '';
      return;
    }
    try {
      const uploadedImages = await Promise.all(files.map((file) => prepareImageUpload(file)));
      setImages((current) => [...current, ...uploadedImages]);
      setValidationError('');
    } catch (caughtError) {
      setValidationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível ler as imagens.');
    }
    event.target.value = '';
  }

  function addAmenity(value = amenityInput) {
    const normalized = value.trim();
    if (!normalized) return;
    if (!amenities.some((item) => item.toLocaleLowerCase('pt-BR') === normalized.toLocaleLowerCase('pt-BR'))) {
      setAmenities((current) => [...current, normalized]);
    }
    setAmenityInput('');
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>, add: () => void) {
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedCapacity = Number(capacity);
    const parsedPrice = Number(price.replace(',', '.'));
    if (!name.trim() || !unitId) return setValidationError('Preencha nome e unidade.');
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) return setValidationError('Informe uma capacidade inteira maior que zero.');
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return setValidationError('Informe um preço por hora maior que zero.');
    const saved = await onSave(
      {
        unitId,
        name: name.trim(),
        capacity: parsedCapacity,
        pricePerHour: parsedPrice,
        amenities,
        imageUrl: images[0] ?? null,
        imageUrls: images,
      },
      room?.id,
    );
    if (saved) onCancel();
  }


  return {
    name, setName, unitId, setUnitId, capacity, setCapacity, price, setPrice,
    images, setImages, imageInput, setImageInput, amenities, setAmenities,
    amenityInput, setAmenityInput, validationError,
    addImageUrl, handleFiles, addAmenity, handleInputKeyDown, handleSubmit,
  };
}
export type RoomFormViewModel = ReturnType<typeof useRoomForm>;
