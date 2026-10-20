import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { businessWallDate } from '../../utils/business-time';
import { services } from '../../services';
import type { Booking, BookingAdminStatus, Room, Unit, AdminBookingRecord, AdminBookingsPage, AdminDailyBookings, AdminBookingsQuery } from '../../types/domain';
import { formatStorageDate, parseTimeSlot } from '../../utils/booking';

export type AdminBookingStatusFilter = BookingAdminStatus | '';

export type AdminBookingRow = AdminBookingRecord;
export interface DailyBookingOptions { daily: true; search: string; unitId: string; operational: string; period: string; }

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

export function useAdminBookings(options?: DailyBookingOptions) {
  const real = Boolean(services.adminBookings);
  const clockOffset = useRef(0);
  const [now, setNow] = useState(() => real ? businessWallDate(new Date().toISOString()) : new Date());
  const today = formatStorageDate(now);
  const [page, setPage] = useState(1);
  const [remote, setRemote] = useState<AdminBookingsPage | null>(null);
  const [dailyRemote, setDailyRemote] = useState<AdminDailyBookings | null>(null);
  const sequence = useRef(0);
  const saving = useRef(false);
  const daily = options?.daily ?? false;
  const dailySearch = options?.search ?? '';
  const dailyUnit = options?.unitId ?? '';
  const operational = options?.operational ?? 'all';
  const period = options?.period ?? 'all';
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

  const load = useCallback(async (showLoading = true) => {
    const request = ++sequence.current;
    if (showLoading) setIsLoading(true);
    setError('');
    try {
      if (services.adminBookings) {
        const query: AdminBookingsQuery = { page, pageSize: 20,
          ...((daily ? dailySearch : search) ? { search: daily ? dailySearch : search } : {}),
          ...((daily ? dailyUnit : unitId) ? { unitId: daily ? dailyUnit : unitId } : {}),
          ...(daily ? {operational, period} : {...(status ? {status} : {}), ...(dateFrom ? {dateFrom} : {}), ...(dateTo ? {dateTo} : {})}) };
        const catalogUnits = await services.catalog.getUnits();
        const panel = daily ? await services.adminBookings.daily(query) : null;
        const result = panel ? panel.agenda : await services.adminBookings.list(query);
        if (request !== sequence.current) return;
        setUnits(catalogUnits); setBookings(result.items); setRemote(result); setDailyRemote(panel);
        clockOffset.current = Date.parse(result.serverNow) - Date.now();
        setNow(businessWallDate(result.serverNow));
        if (!result.items.length && page > 1) setPage(page - 1);
        return;
      }
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
      if (request === sequence.current) setError('Não foi possível carregar os agendamentos.');
    } finally {
      if (request === sequence.current) setIsLoading(false);
    }
  }, [page, search, unitId, status, dateFrom, dateTo, daily, dailySearch, dailyUnit, operational, period]);
  const latestLoad = useRef(load); useEffect(() => { latestLoad.current = load; }, [load]);
  useEffect(() => { setPage(1); }, [search, unitId, status, dateFrom, dateTo, dailySearch, dailyUnit, operational, period]);
  useEffect(() => {
    if (!real) { void load(); return; }
    setIsLoading(true); const timer = window.setTimeout(() => void load(), 250);
    return () => { window.clearTimeout(timer); sequence.current++; };
  }, [load, real]);
  useEffect(() => {
    const timer = window.setInterval(() => {setNow(real ? businessWallDate(new Date(Date.now() + clockOffset.current).toISOString()) : new Date());if(real)void latestLoad.current(false);}, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredBookings = useMemo(() => {
    if (real) return bookings;
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

  const mockStats = useMemo(() => ({
    total: bookings.length,
    confirmed: bookings.filter(({ adminStatus }) => adminStatus === 'confirmed').length,
    pending: bookings.filter(({ adminStatus }) => adminStatus === 'pending').length,
    cancelled: bookings.filter(({ adminStatus }) => adminStatus === 'cancelled').length,
    today: bookings.filter(({ booking }) => booking.date === today).length,
    checkInsToday: bookings.filter(({ booking }) => booking.date === today && Boolean(booking.checkedInAt)).length,
    revenue: bookings.filter(({ adminStatus, booking }) => adminStatus === 'confirmed' && (booking.paymentStatus ?? 'completed') === 'completed').reduce((sum, booking) => sum + (booking.total ?? 0), 0),
  }), [bookings, today]);

  const stats = real && remote ? { ...remote.summary, revenue: remote.summary.revenue ?? 0,
    ...(dailyRemote ? {today: dailyRemote.counts.today, checkInsToday: dailyRemote.counts.checkIns} : {}) } : mockStats;

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
      presentCount: dailyRemote?.counts.present ?? presentNow.length,
      paymentsCount: dailyRemote?.counts.payments ?? pendingPayments.length,
      waitingCount: dailyRemote?.counts.waiting ?? waitingArrival.length,
      firstPayment: dailyRemote ? dailyRemote.firstPayment : pendingPayments[0] ?? null,
      firstWaiting: dailyRemote ? dailyRemote.firstWaiting : waitingArrival[0] ?? null,
      upcomingDays: dailyRemote?.upcomingDays,
      now,
      todayBookings,
      waitingArrival,
      presentNow,
      pendingPayments,
      pendingPaymentTotal: pendingPayments.reduce((sum, item) => sum + (item.total ?? 0), 0),
      nextArrival: dailyRemote ? dailyRemote.nextArrival : nextArrival,
      upcomingBookings,
      tomorrowDate,
      nextWeekDate,
    };
  }, [bookings, now, today, dailyRemote]);

  const confirmBooking = useCallback(async (bookingId: string, expectedVersion?: string) => {
    if (saving.current) return false; saving.current = true;
    setIsSaving(true); setMutationError('');
    try { services.adminBookings ? await services.adminBookings.action(bookingId, 'confirmacao', expectedVersion ?? '') : await services.bookings.confirmBooking(bookingId); await latestLoad.current(false); return true; }
    catch (caughtError) { setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível confirmar o agendamento.'); return false; }
    finally { saving.current = false; setIsSaving(false); }
  }, [load]);

  const cancelBooking = useCallback(async (bookingId: string, reason: string, expectedVersion?: string) => {
    if (saving.current) return false; saving.current = true;
    setIsSaving(true); setMutationError('');
    try { services.adminBookings ? await services.adminBookings.action(bookingId, 'cancelamento', expectedVersion ?? '', reason) : await services.bookings.cancelBookingAsAdmin(bookingId, reason); await latestLoad.current(false); return true; }
    catch (caughtError) { setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível cancelar o agendamento.'); return false; }
    finally { saving.current = false; setIsSaving(false); }
  }, [load]);

  const confirmPayment = useCallback(async (bookingId: string, expectedVersion?: string) => {
    if (saving.current) return false; saving.current = true;
    setIsSaving(true); setMutationError('');
    try { services.adminBookings ? await services.adminBookings.action(bookingId, 'pagamento', expectedVersion ?? '') : await services.bookings.confirmPayment(bookingId); await latestLoad.current(false); return true; }
    catch (caughtError) { setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível confirmar o pagamento.'); return false; }
    finally { saving.current = false; setIsSaving(false); }
  }, [load]);

  const checkInBooking = useCallback(async (bookingId: string, staffUserId: string, expectedVersion?: string) => {
    if (saving.current) return false; saving.current = true;
    setIsSaving(true); setMutationError('');
    try { services.adminBookings ? await services.adminBookings.action(bookingId, 'chegada', expectedVersion ?? '') : await services.bookings.checkInBooking(bookingId, staffUserId); await latestLoad.current(false); return true; }
    catch (caughtError) { setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível realizar o check-in.'); return false; }
    finally { saving.current = false; setIsSaving(false); }
  }, [load]);

  function showToday() { setDateFrom(today); setDateTo(today); }
  function showAllDates() { setDateFrom(''); setDateTo(''); }
  function clearFilters() { setSearch(''); setUnitId(''); setStatus(''); setDateFrom(''); setDateTo(''); }

  return {
    page, setPage, total: remote?.total ?? filteredBookings.length, remoteMode: real,
    bookings: filteredBookings, units, stats, dayPanel, today,
    search, setSearch, unitId, setUnitId, status, setStatus, dateFrom, setDateFrom, dateTo, setDateTo,
    isLoading, isSaving, error, mutationError, clearMutationError: () => setMutationError(''),
    reload: load, confirmBooking, confirmPayment, checkInBooking, cancelBooking, showToday, showAllDates, clearFilters,
  };
}
