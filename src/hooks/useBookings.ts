import { useEffect, useState } from 'react';
import { services } from '../services';
import type { Booking, BookingCounts, BookingStatus, Room, Unit, User } from '../types/domain';

const emptyCounts: BookingCounts = { upcoming: 0, past: 0, cancelled: 0 };

export function useBookings(user: User | null) {
  const [status, setStatus] = useState<BookingStatus>('upcoming');
  const [counts, setCounts] = useState<BookingCounts>(emptyCounts);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [units, setUnits] = useState<Record<string, Unit>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    void services.bookings.getCounts(user.id).then(setCounts);
    void services.bookings.getByUserAndStatus(user.id, status).then(setBookings);
  }, [status, user]);

  useEffect(() => {
    void services.catalog.getUnits().then(async (catalogUnits) => {
      setUnits(Object.fromEntries(catalogUnits.map((unit) => [unit.id, unit])));
      const catalogRooms = (await Promise.all(catalogUnits.map((unit) => services.catalog.getRoomsByUnitId(unit.id)))).flat();
      setRooms(Object.fromEntries(catalogRooms.map((room) => [room.id, room])));
    });
  }, []);

  useEffect(() => {
    if (feedback?.type !== 'success') return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function cancelBooking(booking: Booking) {
    if (!user || cancellingId) return;
    setCancellingId(booking.id);
    setFeedback(null);
    try {
      await services.bookings.cancel(booking.id, user.id);
      const [nextCounts, nextBookings] = await Promise.all([
        services.bookings.getCounts(user.id),
        services.bookings.getByUserAndStatus(user.id, status),
      ]);
      setCounts(nextCounts);
      setBookings(nextBookings);
      setConfirmingId(null);
      setFeedback({ type: 'success', message: 'Agendamento cancelado com sucesso.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível cancelar o agendamento.' });
    } finally {
      setCancellingId(null);
    }
  }


  function requestCancel(id: string) {
    setConfirmingId(id);
    setFeedback(null);
  }
  function keepBooking() { setConfirmingId(null); }
  return {
    status, setStatus, counts, bookings, rooms, units,
    confirmingId, cancellingId, feedback, cancelBooking, requestCancel, keepBooking,
  };
}
export type BookingsViewModel = ReturnType<typeof useBookings>;
