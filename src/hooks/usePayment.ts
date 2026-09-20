import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { services } from '../services';
import type { Room, Unit, User } from '../types/domain';
import { bookingHasConflict } from '../utils/booking';
import { formatCardNumber, formatExpiry, validateCard, type CardForm, type PaymentMethod } from '../utils/payment';

const emptyCard: CardForm = { holder: '', number: '', expiry: '', cvv: '' };
export const pixCode = '00020126580014br.gov.bcb.pix0136connect2work-pagamento-mock5204000053039865802BR';

export function usePayment(user: User | null) {
  const navigate = useNavigate();
  const [draft] = useState(() => services.checkout.getDraft());
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [unit, setUnit] = useState<Unit | null | undefined>(undefined);
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [card, setCard] = useState<CardForm>(emptyCard);
  const [copyStatus, setCopyStatus] = useState('');
  const [error, setError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);

  useEffect(() => {
    if (!draft) return;
    void Promise.all([
      services.catalog.getRoomById(draft.roomId),
      services.catalog.getUnitById(draft.unitId),
    ]).then(([nextRoom, nextUnit]) => {
      setRoom(nextRoom);
      setUnit(nextUnit);
    });
  }, [draft]);


  async function copyPixCode() {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopyStatus('Código PIX copiado.');
    } catch {
      setCopyStatus('Não foi possível copiar. Selecione o código manualmente.');
    }
  }

  function updateCard(field: keyof CardForm, value: string) {
    const nextValue = field === 'number' ? formatCardNumber(value) : field === 'expiry' ? formatExpiry(value) : field === 'cvv' ? value.replace(/\D/g, '').slice(0, 3) : value.slice(0, 80);
    setCard((current) => ({ ...current, [field]: nextValue }));
    setError('');
  }

  async function confirmPayment(event: FormEvent) {
    event.preventDefault();
    if (!draft || !user || draft.userId !== user.id || !room || !unit) return;
    const activeDraft = draft;
    const activeRoom = room;
    const activeUnit = unit;
    setError('');

    if (method === 'card') {
      const cardError = validateCard(card);
      if (cardError) {
        setError(cardError);
        return;
      }
    }

    setIsPaying(true);
    try {
      const latestBookings = await services.bookings.getAll();
      if (bookingHasConflict(latestBookings, activeDraft.roomId, activeDraft.date, activeDraft.timeSlot)) {
        services.checkout.clearDraft();
        setHasConflict(true);
        setError('Este horário acabou de ficar indisponível. Volte e escolha outro período.');
        return;
      }

      const booking = await services.bookings.create({
        userId: activeDraft.userId,
        unitId: activeDraft.unitId,
        roomId: activeDraft.roomId,
        date: activeDraft.date,
        timeSlot: activeDraft.timeSlot,
        status: 'upcoming',
        adminStatus: 'confirmed',
        paymentStatus: 'completed',
        total: activeDraft.total,
        hoursFromPlan: activeDraft.hoursFromPlan,
      });
      services.checkout.clearDraft();
      navigate('/pagamento-confirmado', {
        replace: true,
        state: {
          bookingId: booking.id,
          roomName: activeRoom.name,
          unitName: activeUnit.name,
          date: activeDraft.date,
          timeSlot: activeDraft.timeSlot,
          duration: activeDraft.duration,
        },
      });
    } catch {
      setError('Não foi possível confirmar o pagamento simulado. Tente novamente.');
    } finally {
      setIsPaying(false);
    }
  }

  function selectMethod(value: PaymentMethod) {
    setMethod(value);
    setError('');
  }
  return {
    draft, room, unit, method, card, copyStatus, error, isPaying, hasConflict,
    copyPixCode, updateCard, confirmPayment, selectMethod,
  };
}
export type PaymentViewModel = ReturnType<typeof usePayment>;
