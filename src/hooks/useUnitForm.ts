import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { CreateUnitInput, Unit } from '../types/domain';
import { prepareImageUpload } from '../utils/image-upload';

interface UnitFormOptions {
  unit: Unit | null;
  onCancel(): void;
  onSave(input: CreateUnitInput, unitId?: string): Promise<boolean>;
}

export function useUnitForm({ unit, onCancel, onSave }: UnitFormOptions) {
  const [name, setName] = useState(unit?.name ?? '');
  const [address, setAddress] = useState(unit?.address ?? '');
  const [description, setDescription] = useState(unit?.description ?? '');
  const [latitude, setLatitude] = useState(unit?.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(unit?.longitude?.toString() ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(unit?.imageUrl ?? null);
  const [validationError, setValidationError] = useState('');

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setValidationError('');
    try {
      setImageUrl(await prepareImageUpload(file));
    } catch (caughtError) {
      setValidationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível ler a imagem.');
    }
    event.target.value = '';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    const normalizedAddress = address.trim();
    if (!normalizedName || !normalizedAddress) {
      setValidationError('Preencha o nome e o endereço da unidade.');
      return;
    }
    const normalizedLatitude = latitude.trim() ? Number(latitude.replace(',', '.')) : undefined;
    const normalizedLongitude = longitude.trim() ? Number(longitude.replace(',', '.')) : undefined;
    if (
      (normalizedLatitude !== undefined && (
        !Number.isFinite(normalizedLatitude) || normalizedLatitude < -90 || normalizedLatitude > 90
      )) ||
      (normalizedLongitude !== undefined && (
        !Number.isFinite(normalizedLongitude) || normalizedLongitude < -180 || normalizedLongitude > 180
      ))
    ) {
      setValidationError('Informe coordenadas válidas ou deixe os dois campos vazios.');
      return;
    }
    if ((normalizedLatitude === undefined) !== (normalizedLongitude === undefined)) {
      setValidationError('Informe latitude e longitude juntas.');
      return;
    }
    const saved = await onSave({
      name: normalizedName,
      address: normalizedAddress,
      description: description.trim() || undefined,
      imageUrl,
      latitude: normalizedLatitude,
      longitude: normalizedLongitude,
    }, unit?.id);
    if (saved) onCancel();
  }

  return { name, setName, address, setAddress, description, setDescription,
    latitude, setLatitude, longitude, setLongitude, imageUrl, setImageUrl,
    validationError, handleImageChange, handleSubmit };
}
