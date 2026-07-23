import { useEffect, useRef, useState } from 'react';
import { BackLink } from '../components/BackLink';
import { CalendarIcon, CheckIcon, ClockIcon, CloseIcon, CurrencyIcon, DashboardIcon, TrashIcon } from '../components/icons';
import { useAdminBookings, type AdminBookingRow, type AdminBookingStatusFilter } from '../hooks/useAdminBookings';
import '../assets/css/pages/admin-bookings.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const statusLabels = { confirmed: 'Confirmado', pending: 'Pendente', cancelled: 'Cancelado' } as const;

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function CancelBookingDialog({ item, isSaving, error, onCancel, onConfirm }: { item: AdminBookingRow; isSaving: boolean; error: string; onCancel(): void; onConfirm(): Promise<void> }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className="admin-bookings-modal" aria-labelledby="cancel-booking-title" onCancel={(event) => { event.preventDefault(); if (!isSaving) onCancel(); }}><div><span className="admin-bookings-modal__icon"><TrashIcon width="22" height="22" /></span><h2 id="cancel-booking-title">Cancelar agendamento?</h2><p>Confirma o cancelamento de <strong>{item.roomName}</strong>, em {formatDate(item.booking.date)}, {item.booking.timeSlot}?</p><p>Esta ação não pode ser desfeita.</p>{error && <p className="admin-bookings-modal__error" role="alert">{error}</p>}<footer><button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>Manter agendamento</button><button type="button" className="btn admin-bookings-danger" onClick={() => void onConfirm()} disabled={isSaving}>{isSaving ? 'Cancelando…' : 'Cancelar agendamento'}</button></footer></div></dialog>;
}

export function AdminBookingsPage() {
  const data = useAdminBookings();
  const [cancelling, setCancelling] = useState<AdminBookingRow | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => { if (!statusMessage) return; const timer = window.setTimeout(() => setStatusMessage(''), 5000); return () => window.clearTimeout(timer); }, [statusMessage]);

  async function confirm(item: AdminBookingRow) {
    if (await data.confirmBooking(item.booking.id)) setStatusMessage('Agendamento confirmado com sucesso.');
  }

  async function cancel() {
    if (!cancelling) return;
    if (await data.cancelBooking(cancelling.booking.id)) { setCancelling(null); setStatusMessage('Agendamento cancelado com sucesso.'); }
  }

  const stats = [
    { label: 'Total', value: data.stats.total, icon: DashboardIcon, tone: 'neutral', action: undefined },
    { label: 'Confirmados', value: data.stats.confirmed, icon: CheckIcon, tone: 'success', action: undefined },
    { label: 'Pendentes', value: data.stats.pending, icon: ClockIcon, tone: 'pending', action: undefined },
    { label: 'Cancelados', value: data.stats.cancelled, icon: CloseIcon, tone: 'danger', action: undefined },
    { label: 'Hoje', value: data.stats.today, icon: CalendarIcon, tone: 'accent', action: data.showToday },
    { label: 'Receita Total', value: money.format(data.stats.revenue), icon: CurrencyIcon, tone: 'success', action: undefined },
  ] as const;

  return <main className="admin-bookings-page">
    <BackLink to="/admin/dashboard" label="Voltar ao Dashboard" />
    <header className="admin-bookings-page__intro"><h1><CalendarIcon width="31" height="31" />Gerenciar Agendamentos</h1><p>Visualize e gerencie todos os agendamentos</p></header>
    {statusMessage && <p className="admin-bookings-page__status" role="status">{statusMessage}</p>}
    {data.error && <div className="admin-bookings-page__error" role="alert"><span>{data.error}</span><button type="button" onClick={() => void data.reload()}>Tentar novamente</button></div>}

    <section className="admin-bookings-stats" aria-label="Resumo dos agendamentos" aria-busy={data.isLoading}>
      {stats.map(({ label, value, icon: Icon, tone, action }) => {
        const content = <><span><Icon width="19" height="19" />{label}</span><strong>{data.isLoading ? '—' : value}</strong></>;
        return action ? <button type="button" key={label} className={`admin-bookings-stat tone-${tone}`} onClick={action} aria-label="Mostrar agendamentos de hoje">{content}<small>Aplicar filtro de hoje</small></button> : <article key={label} className={`admin-bookings-stat tone-${tone}`}>{content}</article>;
      })}
    </section>

    <section className="admin-bookings-list" aria-labelledby="admin-bookings-list-title">
      <header><div><h2 id="admin-bookings-list-title">Lista de Agendamentos</h2><p>{data.bookings.length} agendamentos encontrados</p></div></header>
      <div className="admin-bookings-filters" role="search">
        <label className="admin-bookings-search"><span className="sr-only">Buscar agendamento</span><input value={data.search} onChange={(event) => data.setSearch(event.target.value)} placeholder="Buscar por sala, unidade ou ID..." /></label>
        <label><span className="sr-only">Filtrar por unidade</span><select value={data.unitId} onChange={(event) => data.setUnitId(event.target.value)}><option value="">Todas unidades</option>{data.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
        <label><span className="sr-only">Filtrar por status</span><select value={data.status} onChange={(event) => data.setStatus(event.target.value as AdminBookingStatusFilter)}><option value="">Todos</option><option value="confirmed">Confirmado</option><option value="pending">Pendente</option><option value="cancelled">Cancelado</option></select></label>
        <label className="admin-bookings-date"><span>De</span><input type="date" value={data.dateFrom} max={data.dateTo || undefined} onChange={(event) => data.setDateFrom(event.target.value)} /></label>
        <label className="admin-bookings-date"><span>Até</span><input type="date" value={data.dateTo} min={data.dateFrom || undefined} onChange={(event) => data.setDateTo(event.target.value)} /></label>
        <button type="button" className="admin-bookings-show-all" onClick={data.showAllDates}>Mostrar todos</button>
      </div>

      {data.isLoading ? <div className="admin-bookings-loading" aria-label="Carregando agendamentos"><span /><span /><span /></div> : data.bookings.length === 0 ? <div className="admin-bookings-empty"><CalendarIcon width="30" height="30" /><h3>Nenhum agendamento encontrado para os filtros selecionados</h3><p>Altere os filtros ou consulte o histórico completo.</p><button type="button" className="btn btn-secondary" onClick={data.clearFilters}>Limpar filtros</button></div> : <div className="admin-bookings-table-wrap"><table className="admin-bookings-table"><thead><tr><th>ID</th><th>Sala</th><th>Unidade</th><th>Data</th><th>Horário</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>{data.bookings.map((item) => <tr key={item.booking.id} className={item.adminStatus === 'pending' ? 'is-pending' : undefined}><td data-label="ID"><code title={item.booking.id}>{item.booking.id.length > 12 ? `${item.booking.id.slice(0, 10)}…` : item.booking.id}</code></td><td data-label="Sala"><strong>{item.roomName}</strong></td><td data-label="Unidade">{item.unitName}</td><td data-label="Data"><time dateTime={item.booking.date}>{formatDate(item.booking.date)}</time></td><td data-label="Horário">{item.booking.timeSlot}</td><td data-label="Valor"><strong>{money.format(item.total)}</strong></td><td data-label="Status"><span className={`admin-bookings-badge is-${item.adminStatus}`}>{statusLabels[item.adminStatus]}</span></td><td data-label="Ações"><div className="admin-bookings-actions">{item.adminStatus === 'pending' && <button type="button" className="is-confirm" onClick={() => void confirm(item)} disabled={data.isSaving}><CheckIcon width="15" height="15" />Confirmar</button>}{item.adminStatus !== 'cancelled' && <button type="button" className="is-cancel" onClick={() => { data.clearMutationError(); setCancelling(item); }} disabled={data.isSaving}><CloseIcon width="15" height="15" />Cancelar</button>}</div></td></tr>)}</tbody></table></div>}
    </section>
    {cancelling && <CancelBookingDialog item={cancelling} isSaving={data.isSaving} error={data.mutationError} onCancel={() => { setCancelling(null); data.clearMutationError(); }} onConfirm={cancel} />}
  </main>;
}
