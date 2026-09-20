import { useEffect, useRef } from 'react';
import { ClockIcon } from '../icons';
import type { User } from '../../types/domain';

interface RenewalDialogProps {
  user: User;
  saving: boolean;
  error: string;
  onClose(): void;
  onConfirm(): Promise<void>;
}

export function RenewalDialog({ user, saving, error, onClose, onConfirm }: RenewalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="hours-plan-modal hours-plan-modal--renew"
      aria-labelledby="renew-plan-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
    >
      <div>
        <ClockIcon width="25" height="25" />
        <h2 id="renew-plan-title">Confirmar renovação?</h2>
        <p>Confirma que o pagamento do novo ciclo de <strong>{user.name}</strong> foi recebido? O saldo voltará para {user.hoursPlanTotal}h.</p>
        {error && <p className="hours-plan-error" role="alert">{error}</p>}
        <footer>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={() => void onConfirm()} disabled={saving}>
            {saving ? 'Confirmando…' : 'Confirmar renovação'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
