import { useEffect, useRef } from 'react';
import { TrashIcon } from '../icons';
import type { Unit } from '../../types/domain';

interface DeleteUnitDialogProps {
  unit: Unit;
  isSaving: boolean;
  error: string;
  onCancel(): void;
  onConfirm(): Promise<void>;
}

export function DeleteUnitDialog({ unit, isSaving, error, onCancel, onConfirm }: DeleteUnitDialogProps) {
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
