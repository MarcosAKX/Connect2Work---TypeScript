import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { BusinessService, UpdateBusinessServiceInput } from '../../types/domain';
import { services } from '../../services';
import { useImageSelection } from '../../hooks/useImageSelection';
import { prepareImageUpload } from '../../utils/image-upload';

function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

export function useBusinessServiceForm(
  item: BusinessService,
  onClose: () => void,
  onSave: (input: UpdateBusinessServiceInput) => Promise<boolean>,
) {
  const media = useImageSelection(item.imageUrl && item.imageId ? [{ id: item.imageId, url: item.imageUrl }] : []);
  const requestId = useRef(crypto.randomUUID());
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removed, setRemoved] = useState(false);
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
      setImageUrl(services.images ? media.select(file) : await prepareImageUpload(file));
      setRemoved(false);
      setValidationError('');
    } catch (caught) {
      setValidationError(caught instanceof Error ? caught.message : 'Não foi possível processar a imagem.');
    }
    event.target.value = '';
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !description.trim()) return setValidationError('Informe nome e descrição.');
    if (submitting.current) return;
    submitting.current = true; setIsSubmitting(true); setValidationError('');
    try {
    const imageId = services.images ? removed ? null : imageUrl === item.imageUrl ? item.imageId ?? null : (await media.resolve(imageUrl ? [imageUrl] : []))[0] ?? null : undefined;
    if (!media.alive.current) return;
    const saved = await onSave({
      requestId: requestId.current,
      ...(imageId === undefined ? {} : { imageId }),
      kind: item.kind,
      name: name.trim(),
      description: description.trim(),
      primaryFeatures: lines(primary),
      secondaryFeatures: lines(secondary),
      imageUrl,
      active,
      sortOrder: item.sortOrder,
    });
    if (saved && media.alive.current) onClose();
    } catch (caught: unknown) { if (media.alive.current) setValidationError(caught instanceof Error ? caught.message : 'Não foi possível salvar o serviço.'); }
    finally { submitting.current = false; if (media.alive.current) setIsSubmitting(false); }
  }

  return {
    name, setName, description, setDescription, primary, setPrimary,
    secondary, setSecondary, imageUrl, setImageUrl: (value: string | null) => { setImageUrl(value); setRemoved(value === null); }, active, setActive, isSubmitting,
    validationError, upload, submit,
  };
}
