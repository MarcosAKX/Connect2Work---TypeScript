import { useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import type { CreateRoomInput, Room, Unit } from '../../types/domain';
import { prepareImageUpload } from '../../utils/image-upload';
import { services } from '../../services';
import { useImageSelection } from '../../hooks/useImageSelection';

export const MAX_ROOM_IMAGES = 6;
interface RoomFormOptions {
  room: Room | null;
  units: Pick<Unit, 'id' | 'name'>[];
  onCancel(): void;
  onSave(input: CreateRoomInput, roomId?: string): Promise<boolean>;
}
export function useRoomForm({ room, units, onCancel, onSave }: RoomFormOptions) {
  const [name, setName] = useState(room?.name ?? '');
  const [unitId, setUnitId] = useState(room?.unitId ?? units[0]?.id ?? '');
  const [capacity, setCapacity] = useState(String(room?.capacity ?? ''));
  const [price, setPrice] = useState(String(room?.pricePerHour ?? ''));
  const [images, setImages] = useState<string[]>(room?.imageUrls?.length ? room.imageUrls : room?.imageUrl ? [room.imageUrl] : []);
  const [keepHidden, setKeepHidden] = useState(true);
  const hiddenIds = keepHidden ? (room?.imageIds ?? []).filter(id => !room?.images?.some(image => image.id === id)) : [];
  const initialUrls = room?.imageUrls?.length ? room.imageUrls : room?.imageUrl ? [room.imageUrl] : [];
  const [imageInput, setImageInput] = useState('');
  const [amenities, setAmenities] = useState<string[]>(room?.amenities ?? []);
  const [amenityInput, setAmenityInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const media = useImageSelection(room?.images ?? []); const [isSubmitting, setIsSubmitting] = useState(false); const submitting = useRef(false); const requestId = useRef(crypto.randomUUID());


  function addImageUrl() {
    if (services.images) return;
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
    if (images.length + hiddenIds.length + files.length > MAX_ROOM_IMAGES) {
      setValidationError(`Adicione no máximo ${MAX_ROOM_IMAGES} imagens.`);
      event.target.value = '';
      return;
    }
    try {
      const uploadedImages = await Promise.all(files.map((file) => services.images ? media.select(file) : prepareImageUpload(file)));
      if (media.alive.current) setImages((current) => [...current, ...uploadedImages].slice(0, MAX_ROOM_IMAGES));
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
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0 || Math.abs(parsedPrice * 100 - Math.round(parsedPrice * 100)) > 0.0001) return setValidationError('Informe um preço não negativo com até duas casas decimais.');
    if (submitting.current) return; submitting.current = true; setIsSubmitting(true); setValidationError('');
    try {
    const unchanged = images.length === initialUrls.length && images.every((url, index) => url === initialUrls[index]);
    const imageIds = services.images ? unchanged && keepHidden && room?.imageIds ? room.imageIds : [...await media.resolve(images), ...hiddenIds] : undefined;
    if (!media.alive.current) return;
    const saved = await onSave(
      {
        requestId: requestId.current,
        ...(imageIds ? { imageIds } : {}),
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
    if (saved && media.alive.current) onCancel();
    } catch (error: unknown) { if (media.alive.current) setValidationError(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
    finally { submitting.current = false; if (media.alive.current) setIsSubmitting(false); }
  }


  return {
    isSubmitting, allowImageUrl: !services.images, hiddenImageCount: hiddenIds.length, removeHiddenImages: () => setKeepHidden(false),
    name, setName, unitId, setUnitId, capacity, setCapacity, price, setPrice,
    images, setImages, imageInput, setImageInput, amenities, setAmenities,
    amenityInput, setAmenityInput, validationError,
    addImageUrl, handleFiles, addAmenity, handleInputKeyDown, handleSubmit,
  };
}
export type RoomFormViewModel = ReturnType<typeof useRoomForm>;
