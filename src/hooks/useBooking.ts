import { useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { services } from '../services';
import type { AppServices } from '../services/contracts';
import type { Booking, Room, Unit, User } from '../types/domain';
import {
  calculateHoursPlanUsage,
  formatStorageDate,
  hourIsUnavailable,
  HOURS,
  isHoursPlanExpired,
} from '../utils/booking';

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

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setUnit(null);
      return;
    }
    void gateway.catalog.getRoomById(roomId).then(async (nextRoom) => {
      setRoom(nextRoom);
      setUnit(
        nextRoom ? await gateway.catalog.getUnitById(nextRoom.unitId) : null,
      );
    });
    void gateway.bookings.getAll().then(setBookings);
  }, [roomId, gateway]);

  useEffect(() => {
    if (!user) {
      setCurrentUser(null);
      return;
    }
    void gateway.auth.getUserById(user.id).then(setCurrentUser);
  }, [user, gateway]);

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
    currentUser && room
      ? calculateHoursPlanUsage(duration, room.pricePerHour, currentUser)
      : null;
  const projectedBalance = currentUser
    ? Math.max(0, currentUser.hoursBalance - (planUsage?.hoursFromPlan ?? 0))
    : 0;

  function hourUnavailable(index: number, source = bookings) {
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
    if (!selectedDate || unavailable(index)) return;

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
  const planBalanceText = currentUser?.hasHoursPlan
    ? duration > 0 && !planExpired
      ? `${projectedBalance}h restantes`
      : `${currentUser.hoursBalance}h disponíveis`
    : null;

  return {
    room,
    unit,
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
    total: planUsage?.amountToPay ?? (room?.pricePerHour ?? 0) * duration,
    canContinue: Boolean(
      selectedDate && startIndex !== null && endIndex !== null && !isSaving,
    ),
    continueLabel: isSaving
      ? 'Preparando...'
      : planUsage?.hoursFromPlan === duration && duration > 0
        ? 'Confirmar com Plano'
        : 'Continuar para Pagamento',
  };
}

export type BookingViewModel = ReturnType<typeof useBooking>;
