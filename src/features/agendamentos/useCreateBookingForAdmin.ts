import { useEffect, useMemo, useState, useRef } from 'react';
import { businessDateKey } from '../../utils/business-time';
import { services } from '../../services';
import type { Booking, BookingPaymentStatus, ClientSummary, AdminClientOption, Room, Unit } from '../../types/domain';
import { bookingHasConflict, calculateHoursPlanUsage, formatStorageDate, getBookingStart, HOURS, isHoursPlanExpired, parseTimeSlot } from '../../utils/booking';

export function useCreateBookingForAdmin(open: boolean, onCreated: () => Promise<void>) {
  const real = Boolean(services.adminBookings);
  const [clients, setClients] = useState<Array<ClientSummary | AdminClientOption>>([]);
  const loadSequence = useRef(0); const clientSequence = useRef(0); const roomSequence = useRef(0);
  const saving = useRef(false);
  const request = useRef<{key: string; id: string} | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [clientId, setClientId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState(real ? businessDateKey(new Date().toISOString()) : formatStorageDate(new Date()));
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
    const sequence = ++loadSequence.current;
    setIsLoading(true); setError('');
    Promise.all([services.catalog.getUnits(), services.adminBookings ? Promise.resolve([]) : services.bookings.getAll()])
      .then(([availableUnits, currentBookings]) => {
        if (sequence !== loadSequence.current) return;
        setUnits(availableUnits); setBookings(currentBookings);
      })
      .catch(() => {if(sequence === loadSequence.current)setError('Não foi possível carregar os dados do formulário.');})
      .finally(() => {if(sequence === loadSequence.current)setIsLoading(false);});
    return () => {loadSequence.current++;};
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const sequence = ++clientSequence.current;
    const timer = window.setTimeout(() => {
      const promise = services.adminBookings ? services.adminBookings.searchClients(clientQuery) : services.users.searchClients(clientQuery);
      void promise.then(items => {if(sequence===clientSequence.current)setClients(items);}).catch(()=>{if(sequence===clientSequence.current)setError('Não foi possível consultar os clientes.');});
    }, 250);
    return () => {window.clearTimeout(timer);clientSequence.current++;};
  }, [clientQuery, open]);
  useEffect(() => {
    const sequence=++roomSequence.current;
    setRoomId(''); setRooms([]);
    if (unitId) void services.catalog.getRoomsByUnitId(unitId).then(items=>{if(sequence===roomSequence.current)setRooms(items);}).catch(()=>{if(sequence===roomSequence.current)setError('Não foi possível consultar as salas.');});
    return ()=>{roomSequence.current++;};
  }, [unitId]);

  const selectedRoom = rooms.find((room) => room.id === roomId);
  const selectedClient = clients.find((client) => client.id === clientId);
  const timeSlot = startTime && endTime ? `${startTime} - ${endTime}` : '';
  const duration = useMemo(() => {
    const range = parseTimeSlot(timeSlot);
    return range ? (range.end - range.start) / 60 : 0;
  }, [timeSlot]);
  const planClient = selectedClient && 'hasHoursPlan' in selectedClient ? selectedClient : null;
  const planUsage = !real && planClient && selectedRoom ? calculateHoursPlanUsage(duration, selectedRoom.pricePerHour, planClient) : null;

  useEffect(() => {
    if (!totalEdited) setTotal(selectedRoom && duration > 0 ? ((planUsage ? Math.round(planUsage.amountToPay * 100) : Math.round(selectedRoom.pricePerHour * 100) * duration) / 100).toFixed(2) : '');
  }, [duration, planUsage?.amountToPay, selectedRoom, totalEdited]);

  function reset() {
    setClientQuery(''); setClientId(''); setUnitId(''); setRoomId('');
    request.current=null;
    setDate(real ? businessDateKey(new Date().toISOString()) : formatStorageDate(new Date())); setStartTime(''); setEndTime('');
    setTotal(''); setTotalEdited(false); setPaymentStatus('pending'); setError('');
  }

  async function submit() {
    if(saving.current)return false;
    setError('');
    if (!clientId || !unitId || !roomId || !date || !startTime || !endTime) {
      setError('Selecione cliente, unidade, sala, data e horário.');
      return false;
    }
    if (duration <= 0) {
      setError('O horário final deve ser posterior ao horário inicial.');
      return false;
    }
    if (date < (real ? businessDateKey(new Date().toISOString()) : formatStorageDate(new Date()))) {
      setError('A data do agendamento não pode estar no passado.');
      return false;
    }
    const bookingStart = getBookingStart({ date, timeSlot });
    if (!real && (!bookingStart || bookingStart.getTime() <= Date.now())) {
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
    saving.current=true; setIsSaving(true);
    try {
      if (services.adminBookings) {
        const key=JSON.stringify([clientId,roomId,date,timeSlot,total,paymentStatus]);
        if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
        await services.adminBookings.create({requestId:request.current.id,clientId,roomId,date,timeSlot,total:total.replace(',','.'),paymentStatus});
        await onCreated(); reset(); return true;
      }
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
      saving.current=false; setIsSaving(false);
    }
  }

  return {
    clients, units, rooms, clientQuery, setClientQuery: (value: string) => {setClientQuery(value);if(real)setClientId('');}, clientId, setClientId,
    unitId, setUnitId, roomId, setRoomId, date, setDate, startTime, setStartTime,
    endTime, setEndTime, total, setTotal: (value: string) => { setTotal(value); setTotalEdited(true); },
    paymentStatus, setPaymentStatus, duration, selectedClient, planClient, planUsage,
    planExpired: !real && planClient ? isHoursPlanExpired(planClient) : false,
    minimumDate: real ? businessDateKey(new Date().toISOString()) : formatStorageDate(new Date()),
    error, isLoading, isSaving, submit, reset, hours: HOURS,
  };
}
