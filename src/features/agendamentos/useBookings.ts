import { useCallback, useEffect, useRef, useState } from 'react';
import { services } from '../../services';
import type { AppServices } from '../../services/contracts';
import type { Booking, BookingCounts, BookingStatus, Room, Unit, User } from '../../types/domain';

const emptyCounts: BookingCounts = { upcoming: 0, past: 0, cancelled: 0 };
export function useBookings(user: User | null, gateway: AppServices = services) {
  const [status, setStatus] = useState<BookingStatus>('upcoming');
  const [counts, setCounts] = useState<BookingCounts>(emptyCounts);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Record<string, Pick<Room, 'name'>>>({});
  const [units, setUnits] = useState<Record<string, Pick<Unit, 'name'>>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState('');
  const viewKey = `${user?.id ?? ''}/${status}`;
  const generation = useRef(0), reading = useRef(false), writing = useRef(false);
  const current = useRef({ userId: user?.id, status });
  current.current = { userId: user?.id, status };
  const moreRef = useRef<HTMLDivElement>(null);
  const remote = gateway.auth.mode === 'http';

  const load = useCallback(async (cursor?: string) => {
    if (!user) return;
    const visit = generation.current, owner = user.id;
    if (cursor && reading.current) return;
    reading.current = true; setLoading(true);
    const valid = () => generation.current === visit && current.current.userId === owner && current.current.status === status;
    try {
      if (remote) {
        if (!gateway.bookings.listOwn) throw new Error('Consulta ainda não disponível.');
        const page = await gateway.bookings.listOwn(status, cursor);
        if (!valid()) return;
        if (page.items.some(item => item.booking.userId !== owner || item.booking.status !== status)) throw new Error('Não foi possível confirmar seus agendamentos. Atualize a lista.');
        setCounts(page.counts); setNextCursor(page.nextCursor);
        setLoadedFor(`${owner}/${status}`);
        const incoming = page.items.map(item => item.booking);
        setBookings(previous => cursor ? [...previous, ...incoming.filter(item => !previous.some(old => old.id === item.id))] : incoming);
        const roomNames = Object.fromEntries(page.items.map(item => [item.booking.roomId, { name: item.roomName }]));
        const unitNames = Object.fromEntries(page.items.map(item => [item.booking.unitId, { name: item.unitName }]));
        setRooms(previous => cursor ? { ...previous, ...roomNames } : roomNames);
        setUnits(previous => cursor ? { ...previous, ...unitNames } : unitNames);
      } else {
        const [summary, items, catalogUnits] = await Promise.all([gateway.bookings.getCounts(owner), gateway.bookings.getByUserAndStatus(owner, status), gateway.catalog.getUnits()]);
        const catalogRooms = (await Promise.all(catalogUnits.map(unit => gateway.catalog.getRoomsByUnitId(unit.id)))).flat();
        if (!valid()) return;
        setCounts(summary); setBookings(items); setUnits(Object.fromEntries(catalogUnits.map(unit => [unit.id, unit]))); setRooms(Object.fromEntries(catalogRooms.map(room => [room.id, room])));
        setLoadedFor(`${owner}/${status}`);
      }
    } catch (error: unknown) {
      if (valid()) { setNextCursor(null); setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível consultar seus agendamentos.' }); }
    } finally { if (valid()) { reading.current = false; setLoading(false); } }
  }, [gateway, remote, status, user?.id]);

  useEffect(() => {
    generation.current++; reading.current = false;
    setBookings([]); setRooms({}); setUnits({}); setNextCursor(null); setConfirmingId(null); setFeedback(null); setCounts(emptyCounts);
    void load();
    return () => { generation.current++; };
  }, [load]);
  const latestLoad = useRef(load); latestLoad.current = load;
  const loadMore = useCallback(async () => { if (nextCursor) await load(nextCursor); }, [load, nextCursor]);
  useEffect(() => {
    if (!nextCursor || loading || !moreRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) void loadMore(); });
    observer.observe(moreRef.current); return () => observer.disconnect();
  }, [nextCursor, loading, loadMore]);
  useEffect(() => {
    if (feedback?.type !== 'success') return;
    const timer = window.setTimeout(() => setFeedback(null), 8000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function cancelBooking(booking: Booking) {
    if (!user || writing.current || booking.userId !== user.id) return;
    writing.current = true; const owner = user.id;
    setCancellingId(booking.id); setFeedback(null);
    try {
      await gateway.bookings.cancel(booking.id, owner, booking.version);
      if (current.current.userId !== owner) return;
      // Confirmed writes stay confirmed even if refreshing the list fails.
      setConfirmingId(null); setBookings(previous => previous.filter(item => item.id !== booking.id));
      setFeedback({ type: 'success', message: 'Agendamento cancelado com sucesso.' + (remote && booking.paymentStatus === 'completed' ? ' O reembolso será tratado manualmente pela equipe.' : '') });
      generation.current++; reading.current = false;
      await latestLoad.current();
    } catch (error: unknown) {
      if (current.current.userId === owner) setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível cancelar o agendamento.' });
    } finally { writing.current = false; setCancellingId(null); }
  }
  function requestCancel(id: string) { setConfirmingId(id); setFeedback(null); }
  function keepBooking() { setConfirmingId(null); }
  function retry() { setFeedback(null); generation.current++; reading.current = false; void load(); }
  return { status, setStatus, counts: loadedFor === viewKey ? counts : emptyCounts, bookings: loadedFor === viewKey ? bookings : [], rooms, units, confirmingId, cancellingId, feedback, loading, moreRef, loadMore, retry, cancelBooking, requestCancel, keepBooking };
}
export type BookingsViewModel = ReturnType<typeof useBookings>;
