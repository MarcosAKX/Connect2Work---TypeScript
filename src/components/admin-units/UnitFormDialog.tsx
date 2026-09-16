import { useEffect, useRef, type MouseEvent } from 'react';
import { UploadIcon } from '../icons';
import type { CreateUnitInput, Unit } from '../../types/domain';
import { useUnitForm } from '../../hooks/useUnitForm';

interface UnitFormDialogProps {
  unit: Unit | null;
  isSaving: boolean;
  gatewayError: string;
  onCancel(): void;
  onSave(input: CreateUnitInput, unitId?: string): Promise<boolean>;
}

export function UnitFormDialog({ unit, isSaving, gatewayError, onCancel, onSave }: UnitFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { name, setName, address, setAddress, description, setDescription,
    latitude, setLatitude, longitude, setLongitude, imageUrl, setImageUrl,
    validationError, handleImageChange, handleSubmit } = useUnitForm({ unit, onCancel, onSave });

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget && !isSaving) onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      className="admin-modal"
      aria-labelledby="unit-form-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onCancel();
      }}
      onClick={handleBackdropClick}
    >
      <form className="admin-unit-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <header>
          <div>
            <h2 id="unit-form-title">{unit ? 'Editar Unidade' : 'Nova Unidade'}</h2>
            <p>{unit ? 'Atualize os dados da unidade.' : 'Cadastre uma nova unidade do coworking.'}</p>
          </div>
        </header>

        <div className="admin-unit-form__fields">
          <div className="field">
            <label htmlFor="unit-name">Nome</label>
            <input id="unit-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoFocus required />
          </div>
          <div className="field">
            <label htmlFor="unit-address">Endereço</label>
            <input id="unit-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={160} required />
          </div>
          <div className="field">
            <label htmlFor="unit-description">Descrição <span>(opcional)</span></label>
            <textarea id="unit-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={4} />
          </div>
          <div className="admin-unit-form__coordinates">
            <div className="field">
              <label htmlFor="unit-latitude">Latitude <span>(opcional)</span></label>
              <input
                id="unit-latitude"
                inputMode="decimal"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                placeholder="Ex.: -23,550520"
              />
            </div>
            <div className="field">
              <label htmlFor="unit-longitude">Longitude <span>(opcional)</span></label>
              <input
                id="unit-longitude"
                inputMode="decimal"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                placeholder="Ex.: -46,633308"
              />
            </div>
          </div>
          <div className="admin-unit-form__image-field">
            <label htmlFor="unit-image"><UploadIcon width="17" height="17" />Imagem da unidade <span>(até 2 MB)</span></label>
            <input id="unit-image" type="file" accept="image/*" onChange={(event) => void handleImageChange(event)} />
            {imageUrl && (
              <div className="admin-unit-form__preview">
                <img src={imageUrl} alt={`Prévia da unidade ${name || 'sem nome'}`} />
                <button type="button" onClick={() => setImageUrl(null)} disabled={isSaving}>Remover imagem</button>
              </div>
            )}
          </div>
        </div>

        {(validationError || gatewayError) && <p className="admin-modal__error" role="alert">{validationError || gatewayError}</p>}
        <footer>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>Cancelar</button>
          <button type="submit" className={`btn btn-primary${isSaving ? ' is-loading' : ''}`} disabled={isSaving}>
            <span className="btn-label">Salvar</span><span className="btn-spinner" aria-hidden="true" />
          </button>
        </footer>
      </form>
    </dialog>
  );
}
