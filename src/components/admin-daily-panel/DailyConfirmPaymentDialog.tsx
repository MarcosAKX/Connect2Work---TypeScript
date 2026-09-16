import { useEffect, useRef } from 'react';
import type { AdminBookingRow } from '../../hooks/useAdminBookings';
import { CreditCardIcon } from '../icons';
const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function DailyConfirmPaymentDialog({
  item,
  isSaving,
  error,
  onClose,
  onConfirm,
}: {
  item: AdminBookingRow;
  isSaving: boolean;
  error: string;
  onClose(): void;
  onConfirm(): Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="admin-bookings-modal"
      aria-labelledby="daily-confirm-payment-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onClose();
      }}
    >
      <div>
        <span className="admin-bookings-modal__icon admin-bookings-modal__icon--success">
          <CreditCardIcon width="22" height="22" />
        </span>
        <h2 id="daily-confirm-payment-title">Confirmar pagamento?</h2>
        <p>
          Confirma o recebimento de <strong>{money.format(item.total)}</strong>{' '}
          pelo agendamento de <strong>{item.clientName}</strong>?
        </p>
        {error && (
          <p className="admin-bookings-modal__error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Ainda não foi pago
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void onConfirm()}
            disabled={isSaving}
          >
            {isSaving ? 'Confirmando…' : 'Confirmar pagamento'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
