import { useEffect, useMemo, useState } from 'react';
import { services } from '../services';
import type { Booking, BookingPaymentStatus, ClientSummary, Room, Unit } from '../types/domain';
import { bookingHasConflict, calculateHoursPlanUsage, formatStorageDate, getBookingStart, HOURS, isHoursPlanExpired, parseTimeSlot } from '../utils/booking';

export function useCreateBookingForAdmin(open: boolean, onCreated: () => Promise<void>) {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [clientId, setClientId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState(formatStorageDate(new Date()));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [total, setTotal] = useState('');
  const [totalEdited, setTotalEdited] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<BookingPaymentStatus>('pending');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    Promise.all([services.users.searchClients(''), services.catalog.getUnits(), services.bookings.getAll()])
      .then(([availableClients, availableUnits, currentBookings]) => {
        setClients(availableClients); setUnits(availableUnits); setBookings(currentBookings);
      })
      .catch(() => setError('Não foi possível carregar os dados do formulário.'))
      .finally(() => setIsLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void services.users.searchClients(clientQuery).then(setClients);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [clientQuery, open]);

  useEffect(() => {
    setRoomId('');
    setRooms([]);
    if (!unitId) return;
    void services.catalog.getRoomsByUnitId(unitId).then(setRooms);
  }, [unitId]);

  const selectedRoom = rooms.find((room) => room.id === roomId);
  const selectedClient = clients.find((client) => client.id === clientId);
  const timeSlot = startTime && endTime ? `${startTime} - ${endTime}` : '';
  const duration = useMemo(() => {
    const range = parseTimeSlot(timeSlot);
    return range ? (range.end - range.start) / 60 : 0;
  }, [timeSlot]);
  const planUsage = selectedClient && selectedRoom ? calculateHoursPlanUsage(duration, selectedRoom.pricePerHour, selectedClient) : null;

  useEffect(() => {
    if (!totalEdited) setTotal(selectedRoom && duration > 0 ? String(planUsage?.amountToPay ?? selectedRoom.pricePerHour * duration) : '');
  }, [duration, planUsage?.amountToPay, selectedRoom, totalEdited]);

  function reset() {
    setClientQuery(''); setClientId(''); setUnitId(''); setRoomId('');
    setDate(formatStorageDate(new Date())); setStartTime(''); setEndTime('');
    setTotal(''); setTotalEdited(false); setPaymentStatus('pending'); setError('');
  }

  async function submit() {
    setError('');
    if (!clientId || !unitId || !roomId || !date || !startTime || !endTime) {
      setError('Selecione cliente, unidade, sala, data e horário.');
      return false;
    }
    if (duration <= 0) {
      setError('O horário final deve ser posterior ao horário inicial.');
      return false;
    }
    if (date < formatStorageDate(new Date())) {
      setError('A data do agendamento não pode estar no passado.');
      return false;
    }
    const bookingStart = getBookingStart({ date, timeSlot });
    if (!bookingStart || bookingStart.getTime() <= Date.now()) {
      setError('O início do agendamento deve estar no futuro.');
      return false;
    }
    if (bookingHasConflict(bookings, roomId, date, timeSlot)) {
      setError('Este horário já está ocupado para a sala selecionada.');
      return false;
    }
    const parsedTotal = Number(total.replace(',', '.'));
    if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
      setError('Informe um valor válido.');
      return false;
    }
    setIsSaving(true);
    try {
      // Decisão atual: reservas criadas pela operação já nascem confirmadas.
      // Revisar quando o fluxo de aprovação/manual mudar no backend real.
      await services.bookings.create({
        userId: clientId, unitId, roomId, date, timeSlot,
        status: 'upcoming', adminStatus: 'confirmed', total: parsedTotal, paymentStatus: planUsage?.amountToPay === 0 ? 'completed' : paymentStatus,
        hoursFromPlan: planUsage?.hoursFromPlan || undefined,
      });
      await onCreated();
      reset();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar o agendamento.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    clients, units, rooms, clientQuery, setClientQuery, clientId, setClientId,
    unitId, setUnitId, roomId, setRoomId, date, setDate, startTime, setStartTime,
    endTime, setEndTime, total, setTotal: (value: string) => { setTotal(value); setTotalEdited(true); },
    paymentStatus, setPaymentStatus, duration, selectedClient, planUsage,
    planExpired: selectedClient ? isHoursPlanExpired(selectedClient) : false,
    error, isLoading, isSaving, submit, reset, hours: HOURS,
  };
}
