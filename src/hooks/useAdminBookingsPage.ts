import { useEffect, useState } from 'react';
import { useAdminBookings, type AdminBookingRow } from './useAdminBookings';
import type { User } from '../types/domain';
import { canViewBookingValue } from '../utils/admin-bookings-visibility';

// Coordenação exclusiva da listagem. O hook de dados continua compartilhado com Painel do Dia.
export function useAdminBookingsPage(
  user: User | null,
  searchParams: URLSearchParams,
) {
  const data = useAdminBookings();
  const [cancelling, setCancelling] = useState<AdminBookingRow | null>(null);
  const [viewingReason, setViewingReason] = useState<AdminBookingRow | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [confirmingPayment, setConfirmingPayment] =
    useState<AdminBookingRow | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const queryDateFrom = searchParams.get('de') ?? '';
  const queryDateTo = searchParams.get('ate') ?? '';
  const queryUnitId = searchParams.get('unidade') ?? '';
  const shouldCreateBooking = searchParams.get('novo') === '1';
  useEffect(() => {
    if (queryDateFrom) data.setDateFrom(queryDateFrom);
    if (queryDateTo) data.setDateTo(queryDateTo);
    if (queryUnitId) data.setUnitId(queryUnitId);
  }, [
    data.setDateFrom,
    data.setDateTo,
    data.setUnitId,
    queryDateFrom,
    queryDateTo,
    queryUnitId,
  ]);
  useEffect(() => {
    if (shouldCreateBooking) setCreating(true);
  }, [shouldCreateBooking]);
  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(''), 5000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);
  async function confirm(item: AdminBookingRow) {
    if (await data.confirmBooking(item.booking.id))
      setStatusMessage('Agendamento confirmado com sucesso.');
  }
  async function cancel(reason: string) {
    if (
      cancelling &&
      (await data.cancelBooking(cancelling.booking.id, reason))
    ) {
      setCancelling(null);
      setStatusMessage('Agendamento cancelado com sucesso.');
    }
  }
  async function confirmPayment() {
    if (
      confirmingPayment &&
      (await data.confirmPayment(confirmingPayment.booking.id))
    ) {
      setConfirmingPayment(null);
      setStatusMessage('Pagamento confirmado com sucesso.');
    }
  }
  async function checkIn(item: AdminBookingRow) {
    if (user && (await data.checkInBooking(item.booking.id, user.id)))
      setStatusMessage('Check-in realizado com sucesso.');
  }

  function openCancellation(item: AdminBookingRow) {
    data.clearMutationError();
    setCancelling(item);
  }
  function closeCancellation() {
    setCancelling(null);
    data.clearMutationError();
  }
  function openPayment(item: AdminBookingRow) {
    data.clearMutationError();
    setConfirmingPayment(item);
  }
  function closePayment() {
    setConfirmingPayment(null);
    data.clearMutationError();
  }
  async function onCreated() {
    await data.reload(false);
    setStatusMessage('Agendamento criado com sucesso.');
  }
  return {
    data,
    cancelling,
    viewingReason,
    creating,
    confirmingPayment,
    statusMessage,
    isAdmin: user?.role === 'admin',
    isSecretary: user?.role === 'secretaria',
    showBookingValue: canViewBookingValue(user?.role),
    setViewingReason,
    setCreating,
    confirm,
    cancel,
    confirmPayment,
    checkIn,
    openCancellation,
    closeCancellation,
    openPayment,
    closePayment,
    onCreated,
  };
}
export type AdminBookingsViewModel = ReturnType<typeof useAdminBookingsPage>;
