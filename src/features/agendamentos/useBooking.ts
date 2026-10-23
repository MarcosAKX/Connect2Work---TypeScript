import { useEffect, useRef, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { services } from '../../services';
import type { AppServices } from '../../services/contracts';
import type { Booking, BookingAvailability, Room, Unit, User } from '../../types/domain';
import {
  calculateHoursPlanUsage,
  formatStorageDate,
  hourIsUnavailable,
  HOURS,
  isHoursPlanExpired,
} from '../../utils/booking';

import { businessWallDate } from '../../utils/business-time';
import { ConflitoAgendamento } from '../../services/http/agendamentos-http';

interface BookingOptions {
  roomId: string | null;
  user: User | null;
  navigate: NavigateFunction;
}

// ViewModel: coordinates presentation state and gateways; domain rules stay in utils/services.
export function useBooking(
  { roomId, user, navigate }: BookingOptions,
  gateway: AppServices = services,
) {
  const remoteMode = gateway.auth.mode === 'http';
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [unit, setUnit] = useState<Unit | null | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [loadError, setLoadError] = useState('');
  const [loadKey, setLoadKey] = useState(0);
  const [availability, setAvailability] = useState<BookingAvailability | null>(null);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [availabilityKey, setAvailabilityKey] = useState(0);
  const [pendingReservation, setPendingReservation] = useState<Booking | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [, tickClock] = useState(0);
  const sequence = useRef(0), savingRef = useRef(false);
  const requestId = useRef<string | null>(null);
  const attempted = useRef(false);
  const context = `${roomId ?? ''}:${user?.id ?? ''}`;
  const latestContext = useRef({ key:context, generation:0 });
  if (latestContext.current.key !== context) latestContext.current = { key:context, generation:latestContext.current.generation+1 };
  const businessToday = remoteMode ? businessWallDate(new Date(Date.now()+clockOffset).toISOString()) : new Date();
  const dateKey = selectedDate ? formatStorageDate(selectedDate) : '';
  const dayMatches = availability?.roomId === roomId && availability.date === dateKey;
  const availabilityLoading = remoteMode && Boolean(selectedDate) && (availabilityBusy || (!dayMatches && !availabilityError));

  useEffect(() => {
    let active = true;
    setRoom(undefined); setUnit(undefined); setLoadError('');
    setSelectedDate(null); setStartIndex(null); setEndIndex(null); setPendingReservation(null);
    setAvailability(null); setSubmitError(''); requestId.current = null; attempted.current = false;
    if (!roomId) { setRoom(null); setUnit(null); return; }
    void (async () => {
      try {
        const nextRoom = await gateway.catalog.getRoomById(roomId);
        const nextUnit = nextRoom ? await gateway.catalog.getUnitById(nextRoom.unitId) : null;
        if (active) { setRoom(nextRoom); setUnit(nextUnit); }
        if (!remoteMode) { const items = await gateway.bookings.getAll(); if (active) setBookings(items); }
      } catch { if (active) setLoadError('Não foi possível carregar a sala. Tente novamente.'); }
    })();
    return () => { active = false; sequence.current++; };
  }, [roomId, user?.id, gateway, remoteMode, loadKey]);

  useEffect(() => {
    let active = true;
    if (remoteMode || !user) { setCurrentUser(user); return; }
    void gateway.auth.getUserById(user.id).then(value => { if (active) setCurrentUser(value); }).catch(() => { if (active) setCurrentUser(null); });
    return () => { active = false; };
  }, [user, gateway, remoteMode]);

  useEffect(() => {
    if (!remoteMode || !room || room.id !== roomId) return;
    const current = ++sequence.current;
    const date = dateKey || formatStorageDate(businessWallDate(new Date().toISOString()));
    setAvailabilityBusy(true); setAvailabilityError('');
    void gateway.bookings.getAvailability(room.id, date).then(day => {
      if (current !== sequence.current) return;
      setAvailability(day); setClockOffset(Date.parse(day.serverNow)-Date.now());
      if (!dateKey) { const today = businessWallDate(day.serverNow); setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1)); }
    }).catch(cause => { if (current === sequence.current) setAvailabilityError(cause instanceof Error ? cause.message : 'Não foi possível consultar os horários.'); })
      .finally(() => { if (current === sequence.current) setAvailabilityBusy(false); });
    return () => { sequence.current++; };
  }, [room, roomId, dateKey, availabilityKey, gateway, remoteMode]);
  useEffect(() => {
    if (!remoteMode) return;
    const timer = window.setInterval(() => tickClock(value => value+1), 15000);
    return () => window.clearInterval(timer);
  }, [remoteMode]);

  const duration =
    startIndex === null || endIndex === null ? 0 : endIndex - startIndex;
  const selectedSlot =
    startIndex === null ||
    endIndex === null ||
    !HOURS[startIndex] ||
    !HOURS[endIndex]
      ? ''
      : `${HOURS[startIndex]} - ${HOURS[endIndex]}`;
  const planUsage =
    !remoteMode && currentUser && room
      ? calculateHoursPlanUsage(duration, room.pricePerHour, currentUser)
      : null;
  const projectedBalance = currentUser
    ? Math.max(0, currentUser.hoursBalance - (planUsage?.hoursFromPlan ?? 0))
    : 0;

  function hourUnavailable(index: number, source = bookings) {
    if (remoteMode) {
      const hour = HOURS[index];
      const today = formatStorageDate(businessToday);
      return !selectedDate || !dayMatches || availabilityBusy || Boolean(availabilityError) || !availability?.slots[index]?.available
        || !hour || dateKey < today || (dateKey === today && Number(hour.slice(0,2))*60 <= businessToday.getHours()*60+businessToday.getMinutes());
    }
    return (
      !room ||
      !selectedDate ||
      hourIsUnavailable(source, room.id, selectedDate, index)
    );
  }

  function rangeHasUnavailable(start: number, end: number, source = bookings) {
    for (let index = start; index < end; index += 1)
      if (hourUnavailable(index, source)) return true;
    return false;
  }

  function unavailable(index: number, source = bookings) {
    if (!selectedDate) return true;
    if (startIndex !== null && endIndex === null && index > startIndex) {
      return rangeHasUnavailable(startIndex, index, source);
    }
    return index >= HOURS.length - 1 || hourUnavailable(index, source);
  }

  function selectTimeSlot(index: number) {
    if (savingRef.current || pendingReservation || !selectedDate || unavailable(index)) return;
    requestId.current = null; attempted.current = false; setSubmitError('');

    const slotEndIndex = index + 1;
    if (startIndex === null || endIndex === null || index < startIndex) {
      setStartIndex(index);
      setEndIndex(slotEndIndex);
      return;
    }

    if (index >= startIndex && index < endIndex) {
      setStartIndex(index);
      setEndIndex(slotEndIndex);
      return;
    }

    if (rangeHasUnavailable(startIndex, slotEndIndex)) {
      setStartIndex(index);
      setEndIndex(slotEndIndex);
      return;
    }

    setEndIndex(slotEndIndex);
  }

  async function continueToPayment() {
    if (savingRef.current || pendingReservation) return;
    if (remoteMode) {
      if (!room || room.id !== roomId || !unit || !user || !dateKey || !selectedSlot || startIndex === null || endIndex === null
        || (!attempted.current && rangeHasUnavailable(startIndex, endIndex))) return;
      const capturedContext = latestContext.current.generation;
      requestId.current ??= crypto.randomUUID(); attempted.current = true;
      savingRef.current = true; setIsSaving(true); setSubmitError('');
      try {
        const result = await gateway.bookings.create({ requestId: requestId.current, userId: user.id, unitId: unit.id, roomId: room.id, date: dateKey, timeSlot: selectedSlot, status: 'upcoming' });
        if (latestContext.current.generation === capturedContext) setPendingReservation(result);
      } catch (cause: unknown) {
        if (latestContext.current.generation !== capturedContext) return;
        setSubmitError(cause instanceof Error ? cause.message : 'Não foi possível confirmar a solicitação. Repita o mesmo pedido.');
        if (cause instanceof ConflitoAgendamento) {
          setStartIndex(null); setEndIndex(null); setAvailability(null); attempted.current = false; requestId.current = null;
          setAvailabilityKey(value => value+1);
        }
      } finally { savingRef.current = false; setIsSaving(false); }
      return;
    }
    if (
      !room ||
      !unit ||
      !user ||
      !selectedDate ||
      startIndex === null ||
      endIndex === null ||
      !selectedSlot
    )
      return;
    setIsSaving(true);
    setSubmitError('');
    try {
      const latestBookings = await gateway.bookings.getAll();
      if (rangeHasUnavailable(startIndex, endIndex, latestBookings)) {
        setBookings(latestBookings);
        setStartIndex(null);
        setEndIndex(null);
        setSubmitError(
          'Um dos horários selecionados não está mais disponível. Escolha outro período.',
        );
        return;
      }
      const latestUser = await gateway.auth.getUserById(user.id);
      if (!latestUser) throw new Error('Usuário não encontrado.');
      const usage = calculateHoursPlanUsage(
        duration,
        room.pricePerHour,
        latestUser,
      );
      if (usage.hoursFromPlan === duration && duration > 0) {
        const booking = await gateway.bookings.create({
          userId: user.id,
          unitId: unit.id,
          roomId: room.id,
          date: formatStorageDate(selectedDate),
          timeSlot: selectedSlot,
          status: 'upcoming',
          adminStatus: 'confirmed',
          paymentStatus: 'completed',
          total: 0,
          hoursFromPlan: usage.hoursFromPlan,
        });
        navigate('/pagamento-confirmado', {
          replace: true,
          state: {
            bookingId: booking.id,
            roomName: room.name,
            unitName: unit.name,
            date: formatStorageDate(selectedDate),
            timeSlot: selectedSlot,
            duration,
          },
        });
        return;
      }
      gateway.checkout.saveDraft({
        userId: user.id,
        unitId: unit.id,
        roomId: room.id,
        date: formatStorageDate(selectedDate),
        timeSlot: selectedSlot,
        duration,
        total: usage.amountToPay,
        hoursFromPlan: usage.hoursFromPlan || undefined,
        hoursToPay: usage.hoursToPay,
      });
      navigate('/pagamento');
    } catch {
      setSubmitError('Não foi possível preparar o pagamento. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  function selectDate(date: Date) {
    if (savingRef.current || pendingReservation) return;
    if (remoteMode && formatStorageDate(date) === dateKey) setAvailabilityKey(value => value+1);
    sequence.current++; setAvailability(null); setAvailabilityError('');
    requestId.current = null; attempted.current = false;
    setSelectedDate(date);
    setStartIndex(null);
    setEndIndex(null);
    setSubmitError('');
  }

  const slots = HOURS.slice(0, -1).map((hour, index) => ({
    index,
    label: `${hour} – ${HOURS[index + 1]}`,
    selected:
      startIndex !== null &&
      index >= startIndex &&
      (endIndex === null ? index === startIndex : index < endIndex),
    unavailable:
      startIndex !== null && endIndex === null && index > startIndex
        ? rangeHasUnavailable(startIndex, index + 1)
        : unavailable(index),
  }));
  const planExpired = currentUser ? isHoursPlanExpired(currentUser) : false;
  const planBalanceText = !remoteMode && currentUser?.hasHoursPlan
    ? duration > 0 && !planExpired
      ? `${projectedBalance}h restantes`
      : `${currentUser.hoursBalance}h disponíveis`
    : null;

  return {
    room: room && room.id !== roomId ? undefined : room,
    unit: room && room.id !== roomId ? undefined : unit,
    remoteMode, loadError, retryLoad: () => setLoadKey(value => value+1),
    businessToday, availabilityLoading, availabilityError,
    retryAvailability: () => { setAvailability(null); setAvailabilityError(''); setAvailabilityKey(value => value+1); },
    pendingReservation: room?.id === roomId ? pendingReservation : null,
    resetReservation: () => { if (savingRef.current) return; setPendingReservation(null); setSelectedDate(null); setStartIndex(null); setEndIndex(null); setSubmitError(''); requestId.current = null; attempted.current = false; setAvailabilityKey(value => value+1); },
    visibleMonth,
    selectedDate,
    selectedSlot,
    duration,
    slots,
    setVisibleMonth,
    selectDate,
    selectTimeSlot,
    continueToPayment,
    submitError,
    isSaving,
    planBalanceText,
    planBalanceDescription: planExpired
      ? 'Plano aguardando renovação'
      : 'após esta reserva',
    total: remoteMode ? (dayMatches ? availability?.pricePerHour ?? 0 : 0) * duration : planUsage?.amountToPay ?? (room?.pricePerHour ?? 0) * duration,
    canContinue: Boolean(
      selectedDate && startIndex !== null && endIndex !== null && !isSaving && !pendingReservation
        && (!remoteMode || (room?.id === roomId && (attempted.current || !rangeHasUnavailable(startIndex, endIndex)))),
    ),
    continueLabel: remoteMode ? isSaving ? 'Solicitando...' : attempted.current ? 'Tentar confirmar solicitação' : 'Continuar para Pagamento' : isSaving
      ? 'Preparando...'
      : planUsage?.hoursFromPlan === duration && duration > 0
        ? 'Confirmar com Plano'
        : 'Continuar para Pagamento',
  };
}

export type BookingViewModel = ReturnType<typeof useBooking>;
