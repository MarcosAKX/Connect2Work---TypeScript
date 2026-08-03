import { useCallback, useEffect, useMemo, useState } from 'react';
import { services } from '../services';
import type { Booking, BookingAdminStatus, Room, Unit } from '../types/domain';
import { formatStorageDate, parseTimeSlot } from '../utils/booking';

export type AdminBookingStatusFilter = BookingAdminStatus | '';

export interface AdminBookingRow {
  booking: Booking;
  clientName: string;
  roomName: string;
  unitName: string;
  total: number;
  adminStatus: BookingAdminStatus;
}

function getAdminStatus(booking: Booking): BookingAdminStatus {
  if (booking.status === 'cancelled' || booking.adminStatus === 'cancelled') return 'cancelled';
  return booking.adminStatus ?? 'confirmed';
}

function getBookingTotal(booking: Booking, room: Room | undefined) {
  if (typeof booking.total === 'number') return booking.total;
  const range = parseTimeSlot(booking.timeSlot);
  const hours = range ? (range.end - range.start) / 60 : 0;
  return (room?.pricePerHour ?? 0) * hours;
}

export function useAdminBookings() {
  const today = formatStorageDate(new Date());
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [unitId, setUnitId] = useState('');
  const [status, setStatus] = useState<AdminBookingStatusFilter>('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError('');
    try {
      const [catalogUnits, allBookings] = await Promise.all([
        services.catalog.getUnits(), services.bookings.getAll(),
      ]);
      const roomGroups = await Promise.all(catalogUnits.map(({ id }) => services.catalog.getRoomsByUnitId(id)));
      const rooms = roomGroups.flat();
      const userIds = [...new Set(allBookings.map(({ userId }) => userId))];
      const clients = await Promise.all(userIds.map((userId) => services.auth.getUserById(userId)));
      const roomMap = new Map(rooms.map((room) => [room.id, room]));
      const unitMap = new Map(catalogUnits.map((unit) => [unit.id, unit]));
      const clientMap = new Map(clients.filter((client) => client !== null).map((client) => [client.id, client]));
      setUnits(catalogUnits);
      setBookings(allBookings.map((booking) => {
        const room = roomMap.get(booking.roomId);
        return {
          booking,
          clientName: clientMap.get(booking.userId)?.name ?? 'Cliente não encontrado',
          roomName: room?.name ?? 'Sala não encontrada',
          unitName: unitMap.get(booking.unitId)?.name ?? 'Unidade não encontrada',
          total: getBookingTotal(booking, room),
          adminStatus: getAdminStatus(booking),
        };
      }));
    } catch {
      setError('Não foi possível carregar os agendamentos.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    // Para grandes volumes no backend real, substituir este filtro em memória por paginação ou virtualização.
    return bookings.filter((item) => {
      const matchesText = !term || [item.booking.id, item.clientName, item.roomName, item.unitName].some((value) => value.toLocaleLowerCase('pt-BR').includes(term));
      const matchesUnit = !unitId || item.booking.unitId === unitId;
      const matchesStatus = !status || item.adminStatus === status;
      // Datas persistidas em YYYY-MM-DD: comparação lexical ignora hora e evita conversão UTC/fuso.
      const matchesFrom = !dateFrom || item.booking.date >= dateFrom;
      const matchesTo = !dateTo || item.booking.date <= dateTo;
      return matchesText && matchesUnit && matchesStatus && matchesFrom && matchesTo;
    }).sort((first, second) => `${first.booking.date} ${first.booking.timeSlot}`.localeCompare(`${second.booking.date} ${second.booking.timeSlot}`));
  }, [bookings, dateFrom, dateTo, search, status, unitId]);

  const stats = useMemo(() => ({
    total: bookings.length,
    confirmed: bookings.filter(({ adminStatus }) => adminStatus === 'confirmed').length,
    pending: bookings.filter(({ adminStatus }) => adminStatus === 'pending').length,
    cancelled: bookings.filter(({ adminStatus }) => adminStatus === 'cancelled').length,
    today: bookings.filter(({ booking }) => booking.date === today).length,
    checkInsToday: bookings.filter(({ booking }) => booking.date === today && Boolean(booking.checkedInAt)).length,
    revenue: bookings.filter(({ adminStatus, booking }) => adminStatus === 'confirmed' && (booking.paymentStatus ?? 'completed') === 'completed').reduce((sum, booking) => sum + booking.total, 0),
  }), [bookings, today]);

  const dayPanel = useMemo(() => {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const tomorrow = new Date(`${today}T12:00:00`);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = formatStorageDate(tomorrow);
    const nextWeek = new Date(`${today}T12:00:00`);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekDate = formatStorageDate(nextWeek);
    const todayBookings = bookings
      .filter(({ booking }) => booking.date === today)
      .sort((first, second) => first.booking.timeSlot.localeCompare(second.booking.timeSlot));
    const waitingArrival = todayBookings.filter(({ booking, adminStatus }) => adminStatus === 'confirmed' && !booking.checkedInAt);
    const presentNow = todayBookings.filter(({ booking, adminStatus }) => {
      const range = parseTimeSlot(booking.timeSlot);
      return adminStatus === 'confirmed' && Boolean(booking.checkedInAt) && Boolean(range && range.start <= nowMinutes && nowMinutes < range.end);
    });
    const pendingPayments = todayBookings.filter(({ booking, adminStatus }) => adminStatus !== 'cancelled' && (booking.paymentStatus ?? 'completed') === 'pending');
    const nextArrival = waitingArrival.find(({ booking }) => {
      const range = parseTimeSlot(booking.timeSlot);
      return Boolean(range && range.start >= nowMinutes);
    }) ?? null;
    const upcomingBookings = bookings
      .filter(({ booking, adminStatus }) => booking.date > today && booking.date <= nextWeekDate && adminStatus !== 'cancelled')
      .sort((first, second) => `${first.booking.date} ${first.booking.timeSlot}`.localeCompare(`${second.booking.date} ${second.booking.timeSlot}`));

    return {
      now,
      todayBookings,
      waitingArrival,
      presentNow,
      pendingPayments,
      pendingPaymentTotal: pendingPayments.reduce((sum, item) => sum + item.total, 0),
      nextArrival,
      upcomingBookings,
      tomorrowDate,
      nextWeekDate,
    };
  }, [bookings, now, today]);

  const confirmBooking = useCallback(async (bookingId: string) => {
    setIsSaving(true); setMutationError('');
    try { await services.bookings.confirmBooking(bookingId); await load(false); return true; }
    catch (caughtError) { setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível confirmar o agendamento.'); return false; }
    finally { setIsSaving(false); }
  }, [load]);

  const cancelBooking = useCallback(async (bookingId: string, reason: string) => {
    setIsSaving(true); setMutationError('');
    try { await services.bookings.cancelBookingAsAdmin(bookingId, reason); await load(false); return true; }
    catch (caughtError) { setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível cancelar o agendamento.'); return false; }
    finally { setIsSaving(false); }
  }, [load]);

  const confirmPayment = useCallback(async (bookingId: string) => {
    setIsSaving(true); setMutationError('');
    try { await services.bookings.confirmPayment(bookingId); await load(false); return true; }
    catch (caughtError) { setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível confirmar o pagamento.'); return false; }
    finally { setIsSaving(false); }
  }, [load]);

  const checkInBooking = useCallback(async (bookingId: string, staffUserId: string) => {
    setIsSaving(true); setMutationError('');
    try { await services.bookings.checkInBooking(bookingId, staffUserId); await load(false); return true; }
    catch (caughtError) { setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível realizar o check-in.'); return false; }
    finally { setIsSaving(false); }
  }, [load]);

  function showToday() { setDateFrom(today); setDateTo(today); }
  function showAllDates() { setDateFrom(''); setDateTo(''); }
  function clearFilters() { setSearch(''); setUnitId(''); setStatus(''); setDateFrom(''); setDateTo(''); }

  return {
    bookings: filteredBookings, units, stats, dayPanel, today,
    search, setSearch, unitId, setUnitId, status, setStatus, dateFrom, setDateFrom, dateTo, setDateTo,
    isLoading, isSaving, error, mutationError, clearMutationError: () => setMutationError(''),
    reload: load, confirmBooking, confirmPayment, checkInBooking, cancelBooking, showToday, showAllDates, clearFilters,
  };
}
