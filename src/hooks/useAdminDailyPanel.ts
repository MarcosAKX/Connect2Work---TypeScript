import { useEffect, useMemo, useState } from 'react';
import { useAdminBookings, type AdminBookingRow } from './useAdminBookings';
import type { User } from '../types/domain';
import { getStartTime } from '../utils/daily-panel';

export type OperationalFilter =
  'all' | 'waiting' | 'present' | 'payment' | 'checked-in' | 'cancelled';
export type PeriodFilter = 'all' | 'morning' | 'afternoon' | 'next';

// ViewModel da operação diária. Dados e mutações continuam no hook compartilhado.
export function useAdminDailyPanel(user: User | null) {
  const data = useAdminBookings();
  const [confirmingPayment, setConfirmingPayment] =
    useState<AdminBookingRow | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [search, setSearch] = useState('');
  const [unitId, setUnitId] = useState('');
  const [operationalFilter, setOperationalFilter] =
    useState<OperationalFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const currentTime = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(data.dayPanel.now);
  const attentionCount =
    data.dayPanel.pendingPayments.length + data.dayPanel.waitingArrival.length;
  const firstPendingPayment = data.dayPanel.pendingPayments[0];
  const firstWaitingArrival = data.dayPanel.waitingArrival[0];

  const filteredTodayBookings = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const nowMinutes =
      data.dayPanel.now.getHours() * 60 + data.dayPanel.now.getMinutes();
    const presentIds = new Set(
      data.dayPanel.presentNow.map(({ booking }) => booking.id),
    );
    return data.dayPanel.todayBookings.filter((item) => {
      const [hours = 0, minutes = 0] = getStartTime(item.booking.timeSlot)
        .split(':')
        .map(Number);
      const startMinutes = hours * 60 + minutes;
      const paymentPending =
        (item.booking.paymentStatus ?? 'completed') === 'pending' &&
        item.adminStatus !== 'cancelled';
      const matchesSearch =
        !term ||
        [item.clientName, item.roomName, item.unitName].some((value) =>
          value.toLocaleLowerCase('pt-BR').includes(term),
        );
      const matchesUnit = !unitId || item.booking.unitId === unitId;
      const matchesOperation =
        operationalFilter === 'all' ||
        (operationalFilter === 'waiting' &&
          item.adminStatus === 'confirmed' &&
          !item.booking.checkedInAt) ||
        (operationalFilter === 'present' && presentIds.has(item.booking.id)) ||
        (operationalFilter === 'payment' && paymentPending) ||
        (operationalFilter === 'checked-in' &&
          Boolean(item.booking.checkedInAt)) ||
        (operationalFilter === 'cancelled' && item.adminStatus === 'cancelled');
      const matchesPeriod =
        periodFilter === 'all' ||
        (periodFilter === 'morning' && startMinutes < 720) ||
        (periodFilter === 'afternoon' && startMinutes >= 720) ||
        (periodFilter === 'next' &&
          startMinutes >= nowMinutes &&
          startMinutes <= nowMinutes + 180);
      return matchesSearch && matchesUnit && matchesOperation && matchesPeriod;
    });
  }, [
    data.dayPanel.now,
    data.dayPanel.presentNow,
    data.dayPanel.todayBookings,
    operationalFilter,
    periodFilter,
    search,
    unitId,
  ]);

  const upcomingDays = useMemo(() => {
    const counts = new Map<string, number>();
    data.dayPanel.upcomingBookings.forEach(({ booking }) =>
      counts.set(booking.date, (counts.get(booking.date) ?? 0) + 1),
    );
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(`${data.today}T12:00:00`);
      date.setDate(date.getDate() + index + 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { key, count: counts.get(key) ?? 0 };
    });
  }, [data.dayPanel.upcomingBookings, data.today]);

  const hasActiveFilters = Boolean(
    search || unitId || operationalFilter !== 'all' || periodFilter !== 'all',
  );
  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(''), 5000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  async function checkIn(item: AdminBookingRow) {
    if (user && (await data.checkInBooking(item.booking.id, user.id)))
      setStatusMessage('Check-in realizado com sucesso.');
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
  function clearFilters() {
    setSearch('');
    setUnitId('');
    setOperationalFilter('all');
    setPeriodFilter('all');
  }

  function openPayment(item: AdminBookingRow) {
    data.clearMutationError();
    setConfirmingPayment(item);
  }
  function closePayment() {
    setConfirmingPayment(null);
    data.clearMutationError();
  }
  return {
    data,
    confirmingPayment,
    statusMessage,
    search,
    setSearch,
    unitId,
    setUnitId,
    operationalFilter,
    setOperationalFilter,
    periodFilter,
    setPeriodFilter,
    currentTime,
    attentionCount,
    firstPendingPayment,
    firstWaitingArrival,
    filteredTodayBookings,
    upcomingDays,
    hasActiveFilters,
    checkIn,
    confirmPayment,
    clearFilters,
    openPayment,
    closePayment,
  };
}
export type AdminDailyPanelViewModel = ReturnType<typeof useAdminDailyPanel>;
