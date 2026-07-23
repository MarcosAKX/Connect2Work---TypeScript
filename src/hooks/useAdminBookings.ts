import { useCallback, useEffect, useMemo, useState } from 'react';
import { services } from '../services';
import type { Booking, BookingAdminStatus, Room, Unit } from '../types/domain';
import { formatStorageDate, parseTimeSlot } from '../utils/booking';

export type AdminBookingStatusFilter = BookingAdminStatus | '';

export interface AdminBookingRow {
  booking: Booking;
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

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError('');
    try {
      const [catalogUnits, allBookings] = await Promise.all([
        services.catalog.getUnits(), services.bookings.getAll(),
      ]);
      const roomGroups = await Promise.all(catalogUnits.map(({ id }) => services.catalog.getRoomsByUnitId(id)));
      const rooms = roomGroups.flat();
      const roomMap = new Map(rooms.map((room) => [room.id, room]));
      const unitMap = new Map(catalogUnits.map((unit) => [unit.id, unit]));
      setUnits(catalogUnits);
      setBookings(allBookings.map((booking) => {
        const room = roomMap.get(booking.roomId);
        return {
          booking,
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

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    // Para grandes volumes no backend real, substituir este filtro em memória por paginação ou virtualização.
    return bookings.filter((item) => {
      const matchesText = !term || [item.booking.id, item.roomName, item.unitName].some((value) => value.toLocaleLowerCase('pt-BR').includes(term));
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
    revenue: bookings.filter(({ adminStatus }) => adminStatus === 'confirmed').reduce((sum, booking) => sum + booking.total, 0),
  }), [bookings, today]);

  const confirmBooking = useCallback(async (bookingId: string) => {
    setIsSaving(true); setMutationError('');
    try { await services.bookings.confirmBooking(bookingId); await load(false); return true; }
    catch (caughtError) { setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível confirmar o agendamento.'); return false; }
    finally { setIsSaving(false); }
  }, [load]);

  const cancelBooking = useCallback(async (bookingId: string) => {
    setIsSaving(true); setMutationError('');
    try { await services.bookings.cancelBookingAsAdmin(bookingId); await load(false); return true; }
    catch (caughtError) { setMutationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível cancelar o agendamento.'); return false; }
    finally { setIsSaving(false); }
  }, [load]);

  function showToday() { setDateFrom(today); setDateTo(today); }
  function showAllDates() { setDateFrom(''); setDateTo(''); }
  function clearFilters() { setSearch(''); setUnitId(''); setStatus(''); setDateFrom(''); setDateTo(''); }

  return {
    bookings: filteredBookings, units, stats, today,
    search, setSearch, unitId, setUnitId, status, setStatus, dateFrom, setDateFrom, dateTo, setDateTo,
    isLoading, isSaving, error, mutationError, clearMutationError: () => setMutationError(''),
    reload: load, confirmBooking, cancelBooking, showToday, showAllDates, clearFilters,
  };
}
