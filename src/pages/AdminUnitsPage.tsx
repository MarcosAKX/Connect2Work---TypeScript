import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';
import { BackLink } from '../components/BackLink';
import { BuildingIcon, DoorIcon, PencilIcon, PlusIcon, TrashIcon, UploadIcon } from '../components/icons';
import { useAdminUnits } from '../hooks/useAdminUnits';
import type { CreateUnitInput, Unit } from '../types/domain';
import { prepareImageUpload } from '../utils/image-upload';
import '../assets/css/pages/admin-units.css';

interface UnitFormDialogProps {
  unit: Unit | null;
  isSaving: boolean;
  gatewayError: string;
  onCancel(): void;
  onSave(input: CreateUnitInput, unitId?: string): Promise<boolean>;
}

function UnitFormDialog({ unit, isSaving, gatewayError, onCancel, onSave }: UnitFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(unit?.name ?? '');
  const [address, setAddress] = useState(unit?.address ?? '');
  const [description, setDescription] = useState(unit?.description ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(unit?.imageUrl ?? null);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

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
    const saved = await onSave({
      name: normalizedName,
      address: normalizedAddress,
      description: description.trim() || undefined,
      imageUrl,
    }, unit?.id);
    if (saved) onCancel();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget && !isSaving) onCancel();
  }

  return (
    <dialog ref={dialogRef} className="admin-modal" aria-labelledby="unit-form-title" onCancel={(event) => { event.preventDefault(); if (!isSaving) onCancel(); }} onClick={handleBackdropClick}>
      <form className="admin-unit-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <header><div><h2 id="unit-form-title">{unit ? 'Editar Unidade' : 'Nova Unidade'}</h2><p>{unit ? 'Atualize os dados da unidade.' : 'Cadastre uma nova unidade do coworking.'}</p></div></header>

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

interface DeleteUnitDialogProps {
  unit: Unit;
  isSaving: boolean;
  error: string;
  onCancel(): void;
  onConfirm(): Promise<void>;
}

function DeleteUnitDialog({ unit, isSaving, error, onCancel, onConfirm }: DeleteUnitDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={dialogRef} className="admin-modal admin-modal--confirm" aria-labelledby="delete-unit-title" onCancel={(event) => { event.preventDefault(); if (!isSaving) onCancel(); }}>
      <div className="admin-confirm-dialog">
        <div className="admin-confirm-dialog__icon"><TrashIcon width="22" height="22" /></div>
        <h2 id="delete-unit-title">Excluir unidade?</h2>
        <p>Tem certeza que deseja excluir <strong>{unit.name}</strong>? Esta ação não pode ser desfeita.</p>
        {error && <p className="admin-modal__error" role="alert">{error}</p>}
        <footer>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>Manter unidade</button>
          <button type="button" className="btn admin-danger-button" onClick={() => void onConfirm()} disabled={isSaving}>{isSaving ? 'Excluindo…' : 'Excluir unidade'}</button>
        </footer>
      </div>
    </dialog>
  );
}

export function AdminUnitsPage() {
  const { units, isLoading, isSaving, error, mutationError, clearMutationError, reload, saveUnit, deleteUnit } = useAdminUnits();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(''), 5000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  function openCreateForm() {
    clearMutationError();
    setEditingUnit(null);
    setIsFormOpen(true);
  }

  function openEditForm(unit: Unit) {
    clearMutationError();
    setEditingUnit(unit);
    setIsFormOpen(true);
  }

  async function handleSave(input: CreateUnitInput, unitId?: string) {
    const saved = await saveUnit(input, unitId);
    if (saved) setStatusMessage(unitId ? 'Unidade atualizada com sucesso.' : 'Unidade criada com sucesso.');
    return saved;
  }

  async function handleDelete() {
    if (!deletingUnit) return;
    const deleted = await deleteUnit(deletingUnit.id);
    if (deleted) {
      setStatusMessage('Unidade excluída com sucesso.');
      setDeletingUnit(null);
    }
  }

  return (
    <main className="admin-units-page">
      <BackLink to="/admin/dashboard" label="Voltar ao Dashboard" />

      <header className="admin-units-page__intro">
        <div>
          <h1><BuildingIcon width="30" height="30" />Gerenciar Unidades</h1>
          <p>Cadastre, edite e gerencie as unidades do coworking</p>
        </div>
        <button type="button" className="btn btn-primary admin-units-page__new" onClick={openCreateForm}><PlusIcon width="18" height="18" />Nova Unidade</button>
      </header>

      {statusMessage && <p className="admin-units-page__status" role="status">{statusMessage}</p>}
      {error && <div className="admin-units-page__load-error" role="alert"><span>{error}</span><button type="button" onClick={() => void reload()}>Tentar novamente</button></div>}

      <section className="admin-units-card" aria-labelledby="registered-units-title" aria-busy={isLoading}>
        <header><h2 id="registered-units-title">Unidades Cadastradas</h2><p>Total de {units.length} unidades</p></header>

        {isLoading ? (
          <div className="admin-units-loading" aria-label="Carregando unidades"><span /><span /><span /></div>
        ) : units.length === 0 ? (
          <div className="admin-units-empty"><BuildingIcon width="28" height="28" /><h3>Nenhuma unidade cadastrada</h3><p>Cadastre a primeira unidade para começar a gerenciar seus espaços.</p><button type="button" className="btn btn-primary" onClick={openCreateForm}><PlusIcon width="18" height="18" />Nova Unidade</button></div>
        ) : (
          <div className="admin-units-table-wrap">
            <table className="admin-units-table">
              <thead><tr><th scope="col">Nome</th><th scope="col">Endereço</th><th scope="col">Salas</th><th scope="col">Ações</th></tr></thead>
              <tbody>
                {units.map(({ unit, roomCount }) => (
                  <tr key={unit.id}>
                    <td data-label="Nome"><strong>{unit.name}</strong></td>
                    <td data-label="Endereço">{unit.address}</td>
                    <td data-label="Salas"><span className="admin-units-table__rooms"><DoorIcon width="17" height="17" />{roomCount}</span></td>
                    <td data-label="Ações">
                      <div className="admin-units-table__actions">
                        <button type="button" onClick={() => openEditForm(unit)} aria-label={`Editar ${unit.name}`}><PencilIcon width="18" height="18" /></button>
                        <button type="button" className="is-danger" onClick={() => { clearMutationError(); setDeletingUnit(unit); }} aria-label={`Excluir ${unit.name}`}><TrashIcon width="18" height="18" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isFormOpen && <UnitFormDialog unit={editingUnit} isSaving={isSaving} gatewayError={mutationError} onCancel={() => { setIsFormOpen(false); clearMutationError(); }} onSave={handleSave} />}
      {deletingUnit && <DeleteUnitDialog unit={deletingUnit} isSaving={isSaving} error={mutationError} onCancel={() => { setDeletingUnit(null); clearMutationError(); }} onConfirm={handleDelete} />}
    </main>
  );
}
