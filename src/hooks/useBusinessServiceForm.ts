import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { BusinessService, UpdateBusinessServiceInput } from '../types/domain';
import { prepareImageUpload } from '../utils/image-upload';

function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

export function useBusinessServiceForm(
  item: BusinessService,
  onClose: () => void,
  onSave: (input: UpdateBusinessServiceInput) => Promise<boolean>,
) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [primary, setPrimary] = useState(item.primaryFeatures.join('\n'));
  const [secondary, setSecondary] = useState(item.secondaryFeatures.join('\n'));
  const [imageUrl, setImageUrl] = useState(item.imageUrl);
  const [active, setActive] = useState(item.active);
  const [validationError, setValidationError] = useState('');
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImageUrl(await prepareImageUpload(file));
      setValidationError('');
    } catch (caught) {
      setValidationError(caught instanceof Error ? caught.message : 'Não foi possível processar a imagem.');
    }
    event.target.value = '';
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !description.trim()) return setValidationError('Informe nome e descrição.');
    const saved = await onSave({
      kind: item.kind,
      name: name.trim(),
      description: description.trim(),
      primaryFeatures: lines(primary),
      secondaryFeatures: lines(secondary),
      imageUrl,
      active,
      sortOrder: item.sortOrder,
    });
    if (saved) onClose();
  }

  return {
    name, setName, description, setDescription, primary, setPrimary,
    secondary, setSecondary, imageUrl, setImageUrl, active, setActive,
    validationError, upload, submit,
  };
}
