import { useEffect, useRef } from 'react';
import { CloseIcon, UploadIcon } from '../../components/icons';
import type { BusinessService, UpdateBusinessServiceInput } from '../../types/domain';
import { useBusinessServiceForm } from './useBusinessServiceForm';

interface ServiceDialogProps {
  item: BusinessService;
  saving: boolean;
  error: string;
  onClose(): void;
  onSave(input: UpdateBusinessServiceInput): Promise<boolean>;
}

export function ServiceDialog({ item, saving, error, onClose, onSave }: ServiceDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    name, setName, description, setDescription, primary, setPrimary,
    secondary, setSecondary, imageUrl, setImageUrl, active, setActive,
    validationError, upload, submit, isSubmitting,
  } = useBusinessServiceForm(item, onClose, onSave);
  const busy = saving || isSubmitting;
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return <dialog ref={ref} className="admin-service-modal" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <form inert={busy} onSubmit={(event) => void submit(event)}>
      <header>
        <div><h2>{item.id ? 'Editar' : 'Cadastrar'} {item.name}</h2><p>Conteúdo exibido na página Serviços.</p></div>
        <button type="button" onClick={onClose} aria-label="Fechar"><CloseIcon width="20" height="20" /></button>
      </header>
      <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
      <label>Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={300} required /></label>
      <div className="admin-service-modal__columns">
        <label>
          Benefícios — coluna 1
          <textarea value={primary} onChange={(event) => setPrimary(event.target.value)} rows={6} placeholder="Um benefício por linha" />
        </label>
        {item.kind === 'hours_plan' && (
          <label>
            Benefícios — coluna 2
            <textarea value={secondary} onChange={(event) => setSecondary(event.target.value)} rows={6} placeholder="Um benefício por linha" />
          </label>
        )}
      </div>
      <section className="admin-service-modal__image">
        <div>
          <strong>Imagem do serviço</strong>
          <span>JPEG, PNG ou WebP, até 10 MiB. Prefira formato horizontal.</span>
        </div>
        {imageUrl && <img src={imageUrl} alt="Prévia do serviço" />}
        <div>
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <UploadIcon width="18" height="18" />Enviar imagem
          </button>
          {(imageUrl || item.imageId) && <button type="button" className="btn btn-secondary" onClick={() => setImageUrl(null)}>Remover</button>}
          <input
            ref={fileRef} className="sr-only" type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void upload(event)}
          />
        </div>
      </section>
      <label className="admin-service-modal__toggle"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /><span>Serviço ativo e visível para clientes</span></label>
      {(validationError || error) && <p className="admin-service-modal__error" role="alert">{validationError || error}</p>}
      <footer>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</button>
      </footer>
    </form>
  </dialog>;
}
