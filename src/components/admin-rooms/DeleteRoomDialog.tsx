import { useEffect, useRef } from 'react';
import { TrashIcon } from '../icons';
import type { Room } from '../../types/domain';

interface DeleteRoomDialogProps {
  room: Room;
  isSaving: boolean;
  error: string;
  onCancel(): void;
  onConfirm(): Promise<void>;
}
export function DeleteRoomDialog({
  room, isSaving, error, onCancel, onConfirm,
}: DeleteRoomDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="admin-room-modal admin-room-modal--confirm"
      aria-labelledby="delete-room-title"
      onCancel={(event) => { event.preventDefault(); if (!isSaving) onCancel(); }}
    >
      <div className="admin-room-confirm">
        <TrashIcon width="23" height="23" />
        <h2 id="delete-room-title">Excluir sala?</h2>
        <p>Tem certeza que deseja excluir <strong>{room.name}</strong>? Esta ação não pode ser desfeita.</p>
        {error && <p className="admin-room-form__error" role="alert">{error}</p>}
        <footer>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>
            Manter sala
          </button>
          <button type="button" className="btn admin-room-danger" onClick={() => void onConfirm()} disabled={isSaving}>
            {isSaving ? 'Excluindo…' : 'Excluir sala'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
