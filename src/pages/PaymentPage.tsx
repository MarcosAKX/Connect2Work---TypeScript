import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { CopyIcon, CreditCardIcon, LockIcon, QrCodeIcon } from '../components/icons';
import { services } from '../services';
import { useAuth } from '../state/AuthContext';
import type { Room, Unit } from '../types/domain';
import { bookingHasConflict } from '../utils/booking';

type PaymentMethod = 'pix' | 'card';

interface CardForm {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
}

const emptyCard: CardForm = { holder: '', number: '', expiry: '', cvv: '' };
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pixCode = '00020126580014br.gov.bcb.pix0136connect2work-pagamento-mock5204000053039865802BR';

export function PaymentPage() {
  const { user } = useAuth();
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

  if (!draft || !user || draft.userId !== user.id) return <Navigate to="/unidades" replace />;
  if (room === null || unit === null) return <Navigate to="/unidades" replace />;
  if (!room || !unit) return <main className="payment-page"><p>Carregando pagamento...</p></main>;
  const activeDraft = draft;
  const activeRoom = room;
  const activeUnit = unit;

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

  return (
    <main className="payment-page">
      <BackLink to={`/agendamento?sala=${encodeURIComponent(room.id)}`} label="Voltar para agendamento" />

      <form className="payment-layout" onSubmit={confirmPayment} noValidate>
        <section className="payment-panel card" aria-labelledby="payment-method-heading">
          <fieldset className="payment-method-fieldset">
            <legend id="payment-method-heading">Forma de Pagamento</legend>
            <div className="payment-methods" role="radiogroup" aria-label="Escolha a forma de pagamento">
              <button type="button" role="radio" aria-checked={method === 'pix'} className={`payment-method${method === 'pix' ? ' is-selected' : ''}`} onClick={() => { setMethod('pix'); setError(''); }}>
                <span className="payment-method__icon"><QrCodeIcon width="22" height="22" /></span>
                <span><strong>PIX</strong><small>Pagamento instantâneo</small></span>
              </button>
              <button type="button" role="radio" aria-checked={method === 'card'} className={`payment-method${method === 'card' ? ' is-selected' : ''}`} onClick={() => { setMethod('card'); setError(''); }}>
                <span className="payment-method__icon"><CreditCardIcon width="22" height="22" /></span>
                <span><strong>Cartão de Crédito/Débito</strong><small>Simulação segura</small></span>
              </button>
            </div>
          </fieldset>

          <div className="payment-panel__divider" />

          {method === 'pix' ? (
            <section className="pix-payment" aria-labelledby="pix-heading">
              <h2 id="pix-heading" className="sr-only">Pagamento por PIX</h2>
              <DemoQrCode />
              <p>Escaneie o QR Code com seu aplicativo de banco.</p>
              <p className="payment-demo-note"><LockIcon width="15" height="15" />Ambiente de teste: nenhum valor será cobrado.</p>
              <label htmlFor="pix-code">Ou copie o código PIX</label>
              <div className="pix-code-row">
                <input id="pix-code" value={pixCode} readOnly onFocus={(event) => event.currentTarget.select()} />
                <button type="button" className="copy-button" onClick={copyPixCode} aria-label="Copiar código PIX"><CopyIcon width="18" height="18" /></button>
              </div>
              <p className="copy-status" role="status" aria-live="polite">{copyStatus}</p>
            </section>
          ) : (
            <section className="card-payment" aria-labelledby="card-heading">
              <div className="card-payment__heading"><h2 id="card-heading">Dados do cartão</h2><span><LockIcon width="15" height="15" />Não armazenamos estes dados</span></div>
              <div className="payment-field payment-field--full"><label htmlFor="card-holder">Nome impresso no cartão</label><input id="card-holder" autoComplete="cc-name" value={card.holder} onChange={(event) => updateCard('holder', event.target.value)} placeholder="Nome completo" /></div>
              <div className="payment-field payment-field--full"><label htmlFor="card-number">Número do cartão</label><input id="card-number" inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(event) => updateCard('number', event.target.value)} placeholder="0000 0000 0000 0000" maxLength={19} /></div>
              <div className="card-payment__row">
                <div className="payment-field"><label htmlFor="card-expiry">Validade</label><input id="card-expiry" inputMode="numeric" autoComplete="cc-exp" value={card.expiry} onChange={(event) => updateCard('expiry', event.target.value)} placeholder="MM/AA" maxLength={5} /></div>
                <div className="payment-field"><label htmlFor="card-cvv">CVV</label><input id="card-cvv" type="password" inputMode="numeric" autoComplete="cc-csc" value={card.cvv} onChange={(event) => updateCard('cvv', event.target.value)} placeholder="000" maxLength={3} /></div>
              </div>
              <p className="payment-demo-note"><LockIcon width="15" height="15" />Pagamento simulado. Nenhum dado será enviado ou cobrado.</p>
            </section>
          )}
        </section>

        <aside className="payment-summary card" aria-labelledby="payment-summary-heading">
          <h2 id="payment-summary-heading">Resumo</h2>
          <dl className="payment-summary__list">
            <SummaryRow label="Sala" value={room.name} />
            <SummaryRow label="Unidade" value={unit.name} />
            <SummaryRow label="Data" value={formatDisplayDate(activeDraft.date)} />
            <SummaryRow label="Horário" value={activeDraft.timeSlot} />
            <SummaryRow label="Duração" value={`${activeDraft.duration} ${activeDraft.duration === 1 ? 'hora' : 'horas'}`} />
          </dl>
          <div className="payment-summary__total"><span>Total</span><strong>{currency.format(activeDraft.total)}</strong></div>
          {error && <p className="payment-error" role="alert">{error}</p>}
          <button type="submit" className={`btn btn-primary payment-submit${isPaying ? ' is-loading' : ''}`} disabled={isPaying || hasConflict}>
            <span className="btn-label">Pagar {currency.format(activeDraft.total)}</span><span className="btn-spinner" aria-hidden="true" />
          </button>
          <p className="payment-summary__terms">Ao confirmar, você concorda com os termos de uso. Pagamento apenas demonstrativo.</p>
        </aside>
      </form>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="payment-summary__row"><dt>{label}</dt><dd>{value}</dd></div>;
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
}

function formatCardNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function validateCard(card: CardForm) {
  if (card.holder.trim().length < 3) return 'Informe o nome impresso no cartão.';
  if (card.number.replace(/\D/g, '').length !== 16) return 'Informe um número de cartão válido.';
  const [month, year] = card.expiry.split('/').map(Number);
  if (!month || month < 1 || month > 12 || !year) return 'Informe a validade no formato MM/AA.';
  if (card.cvv.length !== 3) return 'Informe o CVV com 3 números.';
  return null;
}

function DemoQrCode() {
  const cells = [
    [9,1],[11,1],[13,1],[9,3],[10,3],[12,3],[14,3],[8,5],[10,5],[12,5],[14,5],[9,7],[11,7],[13,7],
    [1,9],[3,9],[5,9],[7,9],[9,9],[12,9],[14,9],[16,9],[18,9],[20,9],[2,11],[6,11],[8,11],[10,11],[13,11],[17,11],[19,11],
    [9,13],[11,13],[14,13],[16,13],[20,13],[8,15],[10,15],[12,15],[15,15],[18,15],[20,15],[9,17],[13,17],[16,17],[19,17],
    [8,19],[10,19],[12,19],[14,19],[17,19],[20,19],[9,20],[13,20],[15,20],[18,20],
  ];
  return <div className="payment-qr" role="img" aria-label="QR Code demonstrativo para pagamento PIX"><svg viewBox="0 0 22 22" shapeRendering="crispEdges"><rect width="22" height="22" fill="#fff"/><Finder x={1} y={1}/><Finder x={15} y={1}/><Finder x={1} y={15}/>{cells.map(([x, y], index) => <rect key={index} x={x} y={y} width="1" height="1" fill="#111827"/>)}</svg></div>;
}

function Finder({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}><rect width="6" height="6" fill="#111827"/><rect x="1" y="1" width="4" height="4" fill="#fff"/><rect x="2" y="2" width="2" height="2" fill="#111827"/></g>;
}
