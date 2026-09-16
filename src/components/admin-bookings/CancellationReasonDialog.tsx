import { useEffect, useRef } from 'react';
import type { AdminBookingRow } from '../../hooks/useAdminBookings';
import { formatDate } from './formatters';

export function CancellationReasonDialog({
  item,
  onClose,
}: {
  item: AdminBookingRow;
  onClose(): void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="admin-bookings-modal admin-bookings-modal--reason"
      aria-labelledby="reason-title"
      onCancel={onClose}
    >
      <div>
        <h2 id="reason-title">Motivo do cancelamento</h2>
        <p>
          <strong>{item.roomName}</strong> · {formatDate(item.booking.date)}
        </p>
        <blockquote>
          {item.booking.cancellationReason || 'Motivo não informado'}
        </blockquote>
        <footer>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </dialog>
  );
}
