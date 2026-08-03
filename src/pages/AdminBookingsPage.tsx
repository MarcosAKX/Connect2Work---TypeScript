import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { CalendarIcon, CheckIcon, ClockIcon, CloseIcon, CurrencyIcon, DashboardIcon, PlusIcon, TrashIcon, UserIcon } from '../components/icons';
import { useAdminBookings, type AdminBookingRow, type AdminBookingStatusFilter } from '../hooks/useAdminBookings';
import { useCreateBookingForAdmin } from '../hooks/useCreateBookingForAdmin';
import { useAuth } from '../state/AuthContext';
import '../assets/css/pages/admin-bookings.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const statusLabels = { confirmed: 'Confirmado', pending: 'Pendente', cancelled: 'Cancelado' } as const;
function formatDate(value: string) { const [year, month, day] = value.split('-'); return day && month && year ? `${day}/${month}/${year}` : value; }
function formatCheckInTime(value: string) { return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }

function CancelBookingDialog({ item, isSaving, gatewayError, onClose, onConfirm }: { item: AdminBookingRow; isSaving: boolean; gatewayError: string; onClose(): void; onConfirm(reason: string): Promise<void> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  function submit() {
    if (!reason.trim()) { setValidationError('Informe o motivo do cancelamento.'); return; }
    void onConfirm(reason.trim());
  }
  return <dialog ref={ref} className="admin-bookings-modal" aria-labelledby="cancel-booking-title" onCancel={(event) => { event.preventDefault(); if (!isSaving) onClose(); }}><div><span className="admin-bookings-modal__icon"><TrashIcon width="22" height="22" /></span><h2 id="cancel-booking-title">Cancelar agendamento?</h2><p><strong>{item.roomName}</strong> · {formatDate(item.booking.date)} · {item.booking.timeSlot}</p><label className="admin-bookings-modal__field">Motivo do cancelamento<textarea value={reason} onChange={(event) => { setReason(event.target.value); setValidationError(''); }} maxLength={300} rows={4} placeholder="Ex.: cliente solicitou o cancelamento por telefone" autoFocus /></label>{(validationError || gatewayError) && <p className="admin-bookings-modal__error" role="alert">{validationError || gatewayError}</p>}<footer><button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Manter agendamento</button><button type="button" className="btn admin-bookings-danger" onClick={submit} disabled={isSaving}>{isSaving ? 'Cancelando…' : 'Cancelar agendamento'}</button></footer></div></dialog>;
}

function CancellationReasonDialog({ item, onClose }: { item: AdminBookingRow; onClose(): void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className="admin-bookings-modal admin-bookings-modal--reason" aria-labelledby="reason-title" onCancel={onClose}><div><h2 id="reason-title">Motivo do cancelamento</h2><p><strong>{item.roomName}</strong> · {formatDate(item.booking.date)}</p><blockquote>{item.booking.cancellationReason || 'Motivo não informado'}</blockquote><footer><button type="button" className="btn btn-primary" onClick={onClose}>Fechar</button></footer></div></dialog>;
}

function ConfirmPaymentDialog({ item, isSaving, error, onClose, onConfirm }: { item: AdminBookingRow; isSaving: boolean; error: string; onClose(): void; onConfirm(): Promise<void> }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className="admin-bookings-modal" aria-labelledby="confirm-payment-title" onCancel={(event) => { event.preventDefault(); if (!isSaving) onClose(); }}><div><span className="admin-bookings-modal__icon admin-bookings-modal__icon--success"><CurrencyIcon width="22" height="22" /></span><h2 id="confirm-payment-title">Confirmar pagamento?</h2><p>Confirma o recebimento de <strong>{money.format(item.total)}</strong> pelo agendamento de <strong>{item.roomName}</strong>?</p><p>Após confirmar, o pagamento será marcado como concluído.</p>{error && <p className="admin-bookings-modal__error" role="alert">{error}</p>}<footer><button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Ainda não foi pago</button><button type="button" className="btn btn-primary" onClick={() => void onConfirm()} disabled={isSaving}>{isSaving ? 'Confirmando…' : 'Confirmar pagamento'}</button></footer></div></dialog>;
}

function CreateBookingDialog({ open, onClose, onCreated }: { open: boolean; onClose(): void; onCreated(): Promise<void> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const form = useCreateBookingForAdmin(open, onCreated);
  useEffect(() => { if (open) ref.current?.showModal(); else ref.current?.close(); }, [open]);
  async function submit() { if (await form.submit()) onClose(); }
  return <dialog ref={ref} className="admin-bookings-modal admin-bookings-modal--create" aria-labelledby="create-booking-title" onCancel={(event) => { event.preventDefault(); if (!form.isSaving) { form.reset(); onClose(); } }}><div><h2 id="create-booking-title">Novo Agendamento</h2><p>Crie uma reserva confirmada em nome de um cliente.</p>
    <div className="admin-booking-form">
      <fieldset><legend>Cliente</legend><input value={form.clientQuery} onChange={(event) => form.setClientQuery(event.target.value)} placeholder="Buscar por nome ou e-mail" autoComplete="off" /><div className="admin-booking-client-results">{form.clients.map((client) => <label key={client.id} className={form.clientId === client.id ? 'is-selected' : ''}><input type="radio" name="client" value={client.id} checked={form.clientId === client.id} onChange={() => form.setClientId(client.id)} /><span><strong>{client.name}</strong><small>{client.email}</small></span></label>)}{!form.isLoading && form.clients.length === 0 && <small>Nenhum cliente ativo encontrado.</small>}</div></fieldset>
      {form.selectedClient?.hasHoursPlan && <div className={`admin-booking-plan-note${form.planExpired ? ' is-expired' : ''}`}><span>{form.planExpired ? 'Plano aguardando renovação: será cobrado o valor integral. Renove-o em Planos de Horas.' : form.duration > 0 ? `${form.planUsage?.hoursFromPlan ?? 0}h debitadas do plano · ${form.planUsage?.hoursToPay ?? 0}h cobradas à parte.` : `Saldo disponível: ${form.selectedClient.hoursBalance}h.`}</span></div>}
      <div className="admin-booking-form__grid"><label>Unidade<select value={form.unitId} onChange={(event) => form.setUnitId(event.target.value)}><option value="">Selecione</option>{form.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label>Sala<select value={form.roomId} onChange={(event) => form.setRoomId(event.target.value)} disabled={!form.unitId}><option value="">Selecione</option>{form.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label><label>Data<input type="date" min={new Date().toLocaleDateString('en-CA')} value={form.date} onChange={(event) => form.setDate(event.target.value)} /></label><label>Início<select value={form.startTime} onChange={(event) => form.setStartTime(event.target.value)}><option value="">Selecione</option>{form.hours.slice(0, -1).map((hour) => <option key={hour} value={hour}>{hour}</option>)}</select></label><label>Fim<select value={form.endTime} onChange={(event) => form.setEndTime(event.target.value)}><option value="">Selecione</option>{form.hours.map((hour) => <option key={hour} value={hour}>{hour}</option>)}</select></label><label>Valor (R$)<input inputMode="decimal" value={form.total} onChange={(event) => form.setTotal(event.target.value)} placeholder="0,00" /></label><label>Pagamento<select value={form.paymentStatus} onChange={(event) => form.setPaymentStatus(event.target.value === 'completed' ? 'completed' : 'pending')}><option value="pending">Pendente</option><option value="completed">Concluído</option></select></label></div>
    </div>{form.duration > 0 && <p className="admin-booking-form__summary">{form.duration}h reservadas · valor ajustável</p>}{form.error && <p className="admin-bookings-modal__error" role="alert">{form.error}</p>}<footer><button type="button" className="btn btn-secondary" onClick={() => { form.reset(); onClose(); }} disabled={form.isSaving}>Cancelar</button><button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={form.isSaving || form.isLoading}>{form.isSaving ? 'Salvando…' : 'Criar agendamento'}</button></footer></div></dialog>;
}

export function AdminBookingsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const data = useAdminBookings();
  const [cancelling, setCancelling] = useState<AdminBookingRow | null>(null);
  const [viewingReason, setViewingReason] = useState<AdminBookingRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState<AdminBookingRow | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const queryDateFrom = searchParams.get('de') ?? '';
  const queryDateTo = searchParams.get('ate') ?? '';
  const queryUnitId = searchParams.get('unidade') ?? '';
  useEffect(() => {
    if (queryDateFrom) data.setDateFrom(queryDateFrom);
    if (queryDateTo) data.setDateTo(queryDateTo);
    if (queryUnitId) data.setUnitId(queryUnitId);
  }, [data.setDateFrom, data.setDateTo, data.setUnitId, queryDateFrom, queryDateTo, queryUnitId]);
  useEffect(() => { if (!statusMessage) return; const timer = window.setTimeout(() => setStatusMessage(''), 5000); return () => window.clearTimeout(timer); }, [statusMessage]);
  async function confirm(item: AdminBookingRow) { if (await data.confirmBooking(item.booking.id)) setStatusMessage('Agendamento confirmado com sucesso.'); }
  async function cancel(reason: string) { if (cancelling && await data.cancelBooking(cancelling.booking.id, reason)) { setCancelling(null); setStatusMessage('Agendamento cancelado com sucesso.'); } }
  async function confirmPayment() { if (confirmingPayment && await data.confirmPayment(confirmingPayment.booking.id)) { setConfirmingPayment(null); setStatusMessage('Pagamento confirmado com sucesso.'); } }
  async function checkIn(item: AdminBookingRow) { if (user && await data.checkInBooking(item.booking.id, user.id)) setStatusMessage('Check-in realizado com sucesso.'); }
  const stats = [
    { label: 'Total', value: data.stats.total, icon: DashboardIcon, tone: 'neutral', action: undefined },
    { label: 'Confirmados', value: data.stats.confirmed, icon: CheckIcon, tone: 'success', action: undefined },
    { label: 'Pendentes', value: data.stats.pending, icon: ClockIcon, tone: 'pending', action: undefined },
    { label: 'Cancelados', value: data.stats.cancelled, icon: CloseIcon, tone: 'danger', action: undefined },
    { label: 'Hoje', value: data.stats.today, icon: CalendarIcon, tone: 'accent', action: data.showToday },
    { label: 'Check-ins Hoje', value: `${data.stats.checkInsToday} de ${data.stats.today}`, icon: UserIcon, tone: 'success', action: undefined },
    ...(user?.role === 'admin' ? [{ label: 'Receita Total', value: money.format(data.stats.revenue), icon: CurrencyIcon, tone: 'success', action: undefined } as const] : []),
  ] as const;
  return <main className="admin-bookings-page">
    {user?.role === 'admin' && <BackLink to="/admin/dashboard" label="Voltar ao Dashboard" />}
    <header className="admin-bookings-page__intro"><div><h1><CalendarIcon width="31" height="31" />Gerenciar Agendamentos</h1><p>Visualize e gerencie todos os agendamentos</p></div><button type="button" className="btn btn-primary btn--inline admin-bookings-new" onClick={() => setCreating(true)}><PlusIcon width="15" height="15" />Novo Agendamento</button></header>
    {statusMessage && <p className="admin-bookings-page__status" role="status">{statusMessage}</p>}{data.error && <div className="admin-bookings-page__error" role="alert"><span>{data.error}</span><button type="button" onClick={() => void data.reload()}>Tentar novamente</button></div>}{data.mutationError && !cancelling && !confirmingPayment && <div className="admin-bookings-page__error" role="alert"><span>{data.mutationError}</span><button type="button" onClick={data.clearMutationError}>Fechar</button></div>}
    <section className={`admin-bookings-stats${user?.role === 'secretaria' ? ' is-secretary' : ''}`} aria-label="Resumo dos agendamentos" aria-busy={data.isLoading}>{stats.map(({ label, value, icon: Icon, tone, action }) => { const content = <><span><Icon width="19" height="19" />{label}</span><strong>{data.isLoading ? '—' : value}</strong></>; return action ? <button type="button" key={label} className={`admin-bookings-stat tone-${tone}`} onClick={action}>{content}<small>Aplicar filtro de hoje</small></button> : <article key={label} className={`admin-bookings-stat tone-${tone}`}>{content}</article>; })}</section>
    <section className="admin-bookings-list" aria-labelledby="admin-bookings-list-title"><header><div><h2 id="admin-bookings-list-title">Lista de Agendamentos</h2><p>{data.bookings.length} agendamentos encontrados</p></div><div className="admin-bookings-list-summary"><span><strong>{data.stats.confirmed}</strong> confirmados</span><span><strong>{data.stats.cancelled}</strong> cancelados</span><span><strong>{money.format(data.stats.revenue)}</strong> recebidos</span></div></header><div className="admin-bookings-filters" role="search"><label className="admin-bookings-search"><span className="sr-only">Buscar agendamento</span><input value={data.search} onChange={(event) => data.setSearch(event.target.value)} placeholder="Buscar por cliente, sala, unidade ou ID..." /></label><label><span className="sr-only">Filtrar por unidade</span><select value={data.unitId} onChange={(event) => data.setUnitId(event.target.value)}><option value="">Todas unidades</option>{data.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label><span className="sr-only">Filtrar por status</span><select value={data.status} onChange={(event) => data.setStatus(event.target.value as AdminBookingStatusFilter)}><option value="">Todos</option><option value="confirmed">Confirmado</option><option value="pending">Pendente</option><option value="cancelled">Cancelado</option></select></label><label className="admin-bookings-date"><span>De</span><input type="date" value={data.dateFrom} max={data.dateTo || undefined} onChange={(event) => data.setDateFrom(event.target.value)} /></label><label className="admin-bookings-date"><span>Até</span><input type="date" value={data.dateTo} min={data.dateFrom || undefined} onChange={(event) => data.setDateTo(event.target.value)} /></label><button type="button" className="admin-bookings-show-all" onClick={data.showAllDates}>Mostrar todos</button></div>
      {data.isLoading ? (
        <div className="admin-bookings-loading" aria-label="Carregando agendamentos"><span /><span /><span /></div>
      ) : data.bookings.length === 0 ? (
        <div className="admin-bookings-empty"><CalendarIcon width="30" height="30" /><h3>Nenhum agendamento encontrado para os filtros selecionados</h3><p>Altere os filtros ou consulte o histórico completo.</p><button type="button" className="btn btn-secondary" onClick={data.clearFilters}>Limpar filtros</button></div>
      ) : (
        <div className="admin-bookings-table-wrap">
          <table className="admin-bookings-table">
            <thead><tr><th>ID</th><th>Cliente</th><th>Sala</th><th>Unidade</th><th>Data</th><th>Horário</th><th>Valor</th><th>Pagamento</th><th>Status</th><th>Check-in</th><th>Ações</th></tr></thead>
            <tbody>{data.bookings.map((item) => {
              const paymentStatus = item.booking.paymentStatus ?? 'completed';
              const isAwaitingCheckIn = item.booking.date === data.today && item.adminStatus === 'confirmed' && !item.booking.checkedInAt;
              return <tr key={item.booking.id} className={[item.adminStatus === 'pending' ? 'is-pending' : '', isAwaitingCheckIn ? 'is-awaiting-checkin' : ''].filter(Boolean).join(' ') || undefined}>
                <td data-label="ID"><code title={item.booking.id}>{item.booking.id.length > 12 ? `${item.booking.id.slice(0, 10)}…` : item.booking.id}</code></td>
                <td data-label="Cliente"><strong>{item.clientName}</strong></td>
                <td data-label="Sala"><strong>{isAwaitingCheckIn && <span className="admin-bookings-arrival-dot" title="Aguardando chegada hoje" />}{item.roomName}</strong></td>
                <td data-label="Unidade">{item.unitName}</td>
                <td data-label="Data"><time dateTime={item.booking.date}>{formatDate(item.booking.date)}</time></td>
                <td data-label="Horário">{item.booking.timeSlot}</td>
                <td data-label="Valor"><strong>{money.format(item.total)}</strong></td>
                <td data-label="Pagamento">{paymentStatus === 'pending' && item.adminStatus !== 'cancelled' ? <button type="button" className="admin-bookings-payment is-pending is-clickable is-action" onClick={() => { data.clearMutationError(); setConfirmingPayment(item); }} disabled={data.isSaving} title="Confirmar recebimento"><CurrencyIcon width="14" height="14" />Confirmar pagamento</button> : <span className={`admin-bookings-payment is-${paymentStatus}`}>{paymentStatus === 'completed' ? 'Concluído' : 'Pendente'}</span>}</td>
                <td data-label="Status">{item.adminStatus === 'cancelled' ? <button type="button" className="admin-bookings-badge is-cancelled is-clickable" onClick={() => setViewingReason(item)} title="Ver motivo do cancelamento">Cancelado</button> : <span className={`admin-bookings-badge is-${item.adminStatus}`}>{statusLabels[item.adminStatus]}</span>}</td>
                <td data-label="Check-in">{item.adminStatus !== 'confirmed' ? <span className="admin-bookings-checkin-na">—</span> : item.booking.checkedInAt ? <span className="admin-bookings-checkin is-completed"><CheckIcon width="14" height="14" />Chegou às {formatCheckInTime(item.booking.checkedInAt)}</span> : <button type="button" className="admin-bookings-checkin is-action" onClick={() => void checkIn(item)} disabled={data.isSaving}><UserIcon width="14" height="14" />Check-in</button>}</td>
                <td data-label="Ações"><div className="admin-bookings-actions">{item.adminStatus === 'pending' && <button type="button" className="is-confirm" onClick={() => void confirm(item)} disabled={data.isSaving}><CheckIcon width="15" height="15" />Confirmar</button>}{item.adminStatus !== 'cancelled' && <button type="button" className="is-cancel" onClick={() => { data.clearMutationError(); setCancelling(item); }} disabled={data.isSaving}><CloseIcon width="15" height="15" />Cancelar</button>}</div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}</section>
    {cancelling && <CancelBookingDialog item={cancelling} isSaving={data.isSaving} gatewayError={data.mutationError} onClose={() => { setCancelling(null); data.clearMutationError(); }} onConfirm={cancel} />}
    {viewingReason && <CancellationReasonDialog item={viewingReason} onClose={() => setViewingReason(null)} />}
    {confirmingPayment && <ConfirmPaymentDialog item={confirmingPayment} isSaving={data.isSaving} error={data.mutationError} onClose={() => { setConfirmingPayment(null); data.clearMutationError(); }} onConfirm={confirmPayment} />}
    <CreateBookingDialog open={creating} onClose={() => setCreating(false)} onCreated={async () => { await data.reload(false); setStatusMessage('Agendamento criado com sucesso.'); }} />
  </main>;
}
