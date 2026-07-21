import { useCallback, useEffect, useState } from 'react';
import { services } from '../services';
import type { Booking } from '../types/domain';
import { formatStorageDate } from '../utils/booking';

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
  todayBookings: AdminBookingItem[];
  nextBookings: AdminBookingItem[];
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
      const [units, bookings] = await Promise.all([
        services.catalog.getUnits(),
        services.bookings.getAll(),
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
          todayBookings: sortBookings(activeBookings.filter(({ date }) => date === todayValue)).map(toItem),
          nextBookings: sortBookings(activeBookings.filter(({ date, status }) =>
            status === 'upcoming' && date > todayValue && date <= seventhDayValue,
          )).map(toItem),
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
