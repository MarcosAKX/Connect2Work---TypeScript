import { useEffect, useRef, useState } from 'react';
import { TrashIcon } from '../icons';
import type { AdminBookingRow } from '../../hooks/useAdminBookings';
import { formatDate } from './formatters';

export function CancelBookingDialog({
  item,
  isSaving,
  gatewayError,
  onClose,
  onConfirm,
}: {
  item: AdminBookingRow;
  isSaving: boolean;
  gatewayError: string;
  onClose(): void;
  onConfirm(reason: string): Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  function submit() {
    if (!reason.trim()) {
      setValidationError('Informe o motivo do cancelamento.');
      return;
    }
    void onConfirm(reason.trim());
  }
  return (
    <dialog
      ref={ref}
      className="admin-bookings-modal"
      aria-labelledby="cancel-booking-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onClose();
      }}
    >
      <div>
        <span className="admin-bookings-modal__icon">
          <TrashIcon width="22" height="22" />
        </span>
        <h2 id="cancel-booking-title">Cancelar agendamento?</h2>
        <p>
          <strong>{item.roomName}</strong> · {formatDate(item.booking.date)} ·{' '}
          {item.booking.timeSlot}
        </p>
        <label className="admin-bookings-modal__field">
          Motivo do cancelamento
          <textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setValidationError('');
            }}
            maxLength={300}
            rows={4}
            placeholder="Ex.: cliente solicitou o cancelamento por telefone"
            autoFocus
          />
        </label>
        {(validationError || gatewayError) && (
          <p className="admin-bookings-modal__error" role="alert">
            {validationError || gatewayError}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Manter agendamento
          </button>
          <button
            type="button"
            className="btn admin-bookings-danger"
            onClick={submit}
            disabled={isSaving}
          >
            {isSaving ? 'Cancelando…' : 'Cancelar agendamento'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
