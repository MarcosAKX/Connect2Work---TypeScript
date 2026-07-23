import { useCallback, useEffect, useState } from 'react';
import { services } from '../services';
import type { Booking } from '../types/domain';
import { formatStorageDate, parseTimeSlot } from '../utils/booking';

export interface AdminBookingItem {
  id: string;
  userName: string;
  roomName: string;
  unitName: string;
  timeSlot: string;
  date: string;
}

export interface AdminDashboardData {
  unitCount: number;
  roomCount: number;
  bookingCount: number;
  upcomingCount: number;
  activeUserCount: number;
  pendingPaymentCount: number;
  occupiedRoomCount: number;
  checkInsToday: number;
  todayBookings: AdminBookingItem[];
  nextBookings: AdminBookingItem[];
  chartUnits: Array<{ id: string; name: string }>;
  monthlyBookings: Array<{
    key: string;
    label: string;
    active: number;
    cancelled: number;
    byUnit: Record<string, { active: number; cancelled: number }>;
  }>;
}

interface AdminDashboardState {
  data: AdminDashboardData | null;
  error: string;
  isLoading: boolean;
}

function sortBookings(bookings: Booking[]) {
  return [...bookings].sort((first, second) =>
    `${first.date}-${first.timeSlot}`.localeCompare(`${second.date}-${second.timeSlot}`),
  );
}

export function useAdminDashboard() {
  const [state, setState] = useState<AdminDashboardState>({ data: null, error: '', isLoading: true });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, error: '', isLoading: true }));
    try {
      const [units, bookings, users] = await Promise.all([
        services.catalog.getUnits(),
        services.bookings.getAll(),
        services.users.listUsers(),
      ]);
      const roomGroups = await Promise.all(units.map(({ id }) => services.catalog.getRoomsByUnitId(id)));
      const rooms = roomGroups.flat();
      const bookingUserIds = [...new Set(bookings.map(({ userId }) => userId))];
      const bookingUsers = await Promise.all(bookingUserIds.map((id) => services.auth.getUserById(id)));
      const unitNames = new Map(units.map(({ id, name }) => [id, name]));
      const roomNames = new Map(rooms.map(({ id, name }) => [id, name]));
      const userNames = new Map(bookingUsers.filter((user) => user !== null).map(({ id, name }) => [id, name]));
      const activeBookings = bookings.filter(({ status }) => status !== 'cancelled');
      const today = new Date();
      const todayValue = formatStorageDate(today);
      const seventhDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
      const seventhDayValue = formatStorageDate(seventhDay);
      const nowMinutes = today.getHours() * 60 + today.getMinutes();
      const monthlyBookings = Array.from({ length: 12 }, (_, index) => {
        const date = new Date(today.getFullYear(), today.getMonth() - (11 - index), 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const matching = bookings.filter((booking) => booking.date.startsWith(key));
        const summarize = (items: Booking[]) => ({
          active: items.filter(({ status, adminStatus }) => status !== 'cancelled' && adminStatus !== 'cancelled').length,
          cancelled: items.filter(({ status, adminStatus }) => status === 'cancelled' || adminStatus === 'cancelled').length,
        });
        return {
          key,
          label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', ''),
          ...summarize(matching),
          byUnit: Object.fromEntries(units.map((unit) => [unit.id, summarize(matching.filter(({ unitId }) => unitId === unit.id))])),
        };
      });

      const toItem = (booking: Booking): AdminBookingItem => ({
        id: booking.id,
        userName: userNames.get(booking.userId) ?? 'Usuário não encontrado',
        roomName: roomNames.get(booking.roomId) ?? 'Sala não encontrada',
        unitName: unitNames.get(booking.unitId) ?? 'Unidade não encontrada',
        timeSlot: booking.timeSlot,
        date: booking.date,
      });

      setState({
        data: {
          unitCount: units.length,
          roomCount: rooms.length,
          bookingCount: bookings.length,
          upcomingCount: bookings.filter(({ status }) => status === 'upcoming').length,
          activeUserCount: users.filter(({ active }) => active).length,
          pendingPaymentCount: bookings.filter(({ status, adminStatus, paymentStatus }) => status !== 'cancelled' && adminStatus !== 'cancelled' && paymentStatus === 'pending').length,
          occupiedRoomCount: bookings.filter((booking) => {
            const range = parseTimeSlot(booking.timeSlot);
            return booking.date === todayValue
              && booking.adminStatus === 'confirmed'
              && Boolean(booking.checkedInAt)
              && Boolean(range && range.start <= nowMinutes && nowMinutes < range.end);
          }).length,
          checkInsToday: bookings.filter(({ date, checkedInAt }) => date === todayValue && Boolean(checkedInAt)).length,
          todayBookings: sortBookings(activeBookings.filter(({ date }) => date === todayValue)).map(toItem),
          nextBookings: sortBookings(activeBookings.filter(({ date, status }) =>
            status === 'upcoming' && date > todayValue && date <= seventhDayValue,
          )).map(toItem),
          chartUnits: units.map(({ id, name }) => ({ id, name })),
          monthlyBookings,
        },
        error: '',
        isLoading: false,
      });
    } catch {
      setState({ data: null, error: 'Não foi possível carregar os dados administrativos.', isLoading: false });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
