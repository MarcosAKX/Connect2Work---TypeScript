import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, ClockIcon, DoorIcon, ImageIcon, SunIcon, SunsetIcon } from '../components/icons';
import { services } from '../services';
import { useAuth } from '../state/AuthContext';
import type { Booking, Room, Unit, User } from '../types/domain';
import { calculateHoursPlanUsage, formatStorageDate, hourIsUnavailable, HOURS, isHoursPlanExpired, isPastDate, isSameDate } from '../utils/booking';
import { getRoomImages } from '../utils/room-images';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function BookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const roomId = params.get('sala');
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [unit, setUnit] = useState<Unit | null | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setUnit(null);
      return;
    }
    void services.catalog.getRoomById(roomId).then(async (nextRoom) => {
      setRoom(nextRoom);
      setUnit(nextRoom ? await services.catalog.getUnitById(nextRoom.unitId) : null);
    });
    void services.bookings.getAll().then(setBookings);
  }, [roomId]);

  useEffect(() => {
    if (!user) { setCurrentUser(null); return; }
    void services.auth.getUserById(user.id).then(setCurrentUser);
  }, [user]);

  const images = useMemo(() => room ? getRoomImages(room) : [], [room]);

  useEffect(() => {
    setImageIndex(0);
  }, [roomId]);
  const duration = startIndex === null || endIndex === null ? 0 : endIndex - startIndex;
  const selectedSlot = startIndex === null || endIndex === null || !HOURS[startIndex] || !HOURS[endIndex]
    ? ''
    : `${HOURS[startIndex]} - ${HOURS[endIndex]}`;
  const planUsage = currentUser && room ? calculateHoursPlanUsage(duration, room.pricePerHour, currentUser) : null;
  const projectedBalance = currentUser ? Math.max(0, currentUser.hoursBalance - (planUsage?.hoursFromPlan ?? 0)) : 0;

  if (room === null || unit === null) return <Navigate to="/unidades" replace />;
  if (!room || !unit) return <main className="booking-page"><p>Carregando agendamento...</p></main>;
  const activeRoom = room;
  const activeUnit = unit;

  function hourUnavailable(index: number, source = bookings) {
    return !selectedDate || hourIsUnavailable(source, activeRoom.id, selectedDate, index);
  }

  function rangeHasUnavailable(start: number, end: number, source = bookings) {
    for (let index = start; index < end; index += 1) if (hourUnavailable(index, source)) return true;
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
    if (!user || !selectedDate || startIndex === null || endIndex === null || !selectedSlot) return;
    setIsSaving(true);
    setSubmitError('');
    try {
      const latestBookings = await services.bookings.getAll();
      if (rangeHasUnavailable(startIndex, endIndex, latestBookings)) {
        setBookings(latestBookings);
        setStartIndex(null);
        setEndIndex(null);
        setSubmitError('Um dos horários selecionados não está mais disponível. Escolha outro período.');
        return;
      }
      const latestUser = await services.auth.getUserById(user.id);
      if (!latestUser) throw new Error('Usuário não encontrado.');
      const usage = calculateHoursPlanUsage(duration, activeRoom.pricePerHour, latestUser);
      if (usage.hoursFromPlan === duration && duration > 0) {
        const booking = await services.bookings.create({ userId: user.id, unitId: activeUnit.id, roomId: activeRoom.id, date: formatStorageDate(selectedDate), timeSlot: selectedSlot, status: 'upcoming', adminStatus: 'confirmed', paymentStatus: 'completed', total: 0, hoursFromPlan: usage.hoursFromPlan });
        navigate('/pagamento-confirmado', { replace: true, state: { bookingId: booking.id, roomName: activeRoom.name, unitName: activeUnit.name, date: formatStorageDate(selectedDate), timeSlot: selectedSlot, duration } });
        return;
      }
      services.checkout.saveDraft({
        userId: user.id,
        unitId: activeUnit.id,
        roomId: activeRoom.id,
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

  const days = calendarDays(visibleMonth);
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const timeButtons = HOURS.slice(0, -1).map((hour, index) => {
    const isSelected = startIndex !== null && index >= startIndex && (endIndex === null ? index === startIndex : index < endIndex);
    const isUnavailable = startIndex !== null && endIndex === null && index > startIndex ? rangeHasUnavailable(startIndex, index + 1) : unavailable(index);
    return <button key={hour} type="button" className={`time-button${isSelected ? ' is-selected' : ''}${isUnavailable ? ' is-unavailable' : ''}`} disabled={isUnavailable} aria-pressed={isSelected} onClick={() => selectTimeSlot(index)}>{hour} – {HOURS[index + 1]}</button>;
  });

  return (
    <main className="booking-page">
      <nav className="booking-breadcrumb" aria-label="Navegação estrutural"><Link to={`/salas?unidade=${encodeURIComponent(unit.id)}`}>Salas</Link><span aria-hidden="true">/</span><span>{room.name}</span></nav>
      <div className="booking-layout">
        <section className="booking-content">
          <article className="room-details card">
            <div className="room-gallery" aria-label={`Galeria de imagens de ${room.name}`}>
              {images[imageIndex] ? <img className="room-gallery__image" src={images[imageIndex]} alt={`${room.name}, imagem ${imageIndex + 1} de ${images.length}`} /> : <div className="room-gallery__fallback"><ImageIcon width="44" height="44" aria-hidden="true" /><span>Fotos em breve</span></div>}
              {images.length > 1 && <><button className="room-gallery__arrow room-gallery__arrow--previous" type="button" aria-label="Imagem anterior" onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)}><ArrowLeftIcon width="18" height="18" /></button><button className="room-gallery__arrow room-gallery__arrow--next" type="button" aria-label="Próxima imagem" onClick={() => setImageIndex((imageIndex + 1) % images.length)}><ArrowRightIcon width="18" height="18" /></button></>}
              {images.length > 1 && <div className="room-gallery__navigation"><span aria-live="polite">{imageIndex + 1} / {images.length}</span><div className="room-gallery__dots" aria-label="Navegação das imagens">{images.map((_, index) => <button key={index} type="button" className={`room-gallery__dot${index === imageIndex ? ' is-active' : ''}`} aria-label={`Exibir imagem ${index + 1}`} aria-current={index === imageIndex ? 'true' : undefined} onClick={() => setImageIndex(index)} />)}</div></div>}
            </div>
            <div className="room-details__body"><div className="room-details__heading"><div><h1>{room.name}</h1><div className="room-details__meta"><span>{unit.name}</span><span aria-hidden="true">•</span><span>{room.capacity === 1 ? '1 pessoa' : `${room.capacity} pessoas`}</span></div></div><span className="room-details__price">{currency.format(room.pricePerHour)}/hora</span></div><div className="room-amenities" aria-label="Comodidades da sala">{room.amenities.map((amenity) => <span className="room-amenity" key={amenity}>{amenity}</span>)}</div></div>
          </article>
          <ol className="booking-steps" aria-label="Etapas do agendamento">
            <li className={!selectedDate ? 'is-active' : 'is-complete'}><span>1</span><div><strong>Data</strong><small>Escolha o dia</small></div></li>
            <li className={selectedDate && !selectedSlot ? 'is-active' : selectedSlot ? 'is-complete' : ''}><span>2</span><div><strong>Horário</strong><small>Selecione o período</small></div></li>
            <li className={selectedSlot ? 'is-active' : ''}><span>3</span><div><strong>Confirmar</strong><small>Revise e confirme</small></div></li>
          </ol>
          <section className="booking-options">
            <section className="booking-selection card"><div className="booking-section-title"><span aria-hidden="true">▣</span><h2>Selecione a Data</h2></div><div className="calendar"><div className="calendar__header"><button type="button" className="calendar__navigation" aria-label="Mês anterior" disabled={visibleMonth <= currentMonth} onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>‹</button><h3>{visibleMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3><button type="button" className="calendar__navigation" aria-label="Próximo mês" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>›</button></div><div className="calendar__weekdays" aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="calendar__days" role="grid" aria-label="Dias do mês">{days.map((date, index) => date ? <button key={formatStorageDate(date)} type="button" className={`calendar__day${isSameDate(date, new Date()) ? ' is-today' : ''}${selectedDate && isSameDate(date, selectedDate) ? ' is-selected' : ''}`} disabled={isPastDate(date)} aria-label={date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} aria-pressed={Boolean(selectedDate && isSameDate(date, selectedDate))} onClick={() => { setSelectedDate(date); setStartIndex(null); setEndIndex(null); setSubmitError(''); }}>{date.getDate()}</button> : <span key={`empty-${index}`} className="calendar__day calendar__day--empty" aria-hidden="true" />)}</div><p className="selected-date">Data selecionada: <strong>{selectedDate ? selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'nenhuma'}</strong></p></div></section>
            <section className="booking-selection card"><div className="booking-section-title"><ClockIcon width="20" height="20" /><h2>Selecione o Horário</h2></div><p className="time-instruction" id="time-instruction">Selecione um ou mais intervalos consecutivos.</p><div className="time-period"><h3><SunIcon width="18" height="18" />Manhã</h3><div className="time-grid" aria-describedby="time-instruction">{timeButtons.slice(0, 4)}</div></div><div className="time-period"><h3><SunsetIcon width="18" height="18" />Tarde</h3><div className="time-grid">{timeButtons.slice(4)}</div></div><div className="booking-duration"><ClockIcon width="20" height="20" /><span>Duração selecionada: <strong>{duration ? `${duration} ${duration === 1 ? 'hora' : 'horas'}` : 'nenhuma'}</strong></span></div></section>
          </section>
        </section>
        <aside className="booking-summary card"><h2>Resumo do Agendamento</h2><dl className="booking-summary__list" aria-live="polite" aria-atomic="true"><SummaryRow icon={<DoorIcon width="23" height="23" />} value={room.name} secondary={unit.name} /><SummaryRow icon={<CalendarIcon width="23" height="23" />} value={selectedDate?.toLocaleDateString('pt-BR') ?? 'Selecione uma data'} secondary={selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long' })} /><SummaryRow icon={<ClockIcon width="23" height="23" />} value={selectedSlot || 'Selecione o horário'} secondary={duration ? `${duration} ${duration === 1 ? 'hora' : 'horas'}` : undefined} />{currentUser?.hasHoursPlan && <SummaryRow icon={<ClockIcon width="23" height="23" />} value={duration > 0 && !isHoursPlanExpired(currentUser) ? `${projectedBalance}h restantes` : `${currentUser.hoursBalance}h disponíveis`} secondary={isHoursPlanExpired(currentUser) ? 'Plano aguardando renovação' : 'após esta reserva'} />}</dl><div className="booking-summary__total"><span>Total</span><strong>{currency.format(planUsage?.amountToPay ?? room.pricePerHour * duration)}</strong></div>{submitError && <p className="booking-submit-error" role="alert">{submitError}</p>}<button type="button" className="btn btn-primary booking-summary__button" disabled={!selectedDate || startIndex === null || endIndex === null || isSaving} onClick={continueToPayment}>{isSaving ? 'Preparando...' : planUsage?.hoursFromPlan === duration && duration > 0 ? 'Confirmar com Plano' : 'Continuar para Pagamento'}</button><p className="booking-summary__notice">Sua reserva será confirmada após a conclusão desta etapa.</p></aside>
      </div>
    </main>
  );
}

function SummaryRow({ icon, value, secondary }: { icon: ReactNode; value: string; secondary?: string }) {
  return <div className="booking-summary__row"><dt aria-hidden="true">{icon}</dt><dd><strong>{value}</strong>{secondary && <span>{secondary}</span>}</dd></div>;
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const result: Array<Date | null> = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= total; day += 1) result.push(new Date(month.getFullYear(), month.getMonth(), day));
  return result;
}
