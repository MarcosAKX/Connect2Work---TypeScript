import {
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  CurrencyIcon,
  UserIcon,
} from '../icons';
import type { AdminBookingsViewModel } from '../../hooks/useAdminBookingsPage';
import {
  money,
  statusLabels,
  formatDate,
  formatCheckInTime,
} from './formatters';

export function AdminBookingTable({
  data,
  showBookingValue,
  openPayment,
  openCancellation,
  setViewingReason,
  checkIn,
  confirm,
}: Pick<
  AdminBookingsViewModel,
  | 'data'
  | 'showBookingValue'
  | 'openPayment'
  | 'openCancellation'
  | 'setViewingReason'
  | 'checkIn'
  | 'confirm'
>) {
  return data.isLoading ? (
    <div
      className="admin-bookings-loading"
      aria-label="Carregando agendamentos"
    >
      <span />
      <span />
      <span />
    </div>
  ) : data.bookings.length === 0 ? (
    <div className="admin-bookings-empty">
      <CalendarIcon width="30" height="30" />
      <h3>Nenhum agendamento encontrado para os filtros selecionados</h3>
      <p>Altere os filtros ou consulte o histórico completo.</p>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={data.clearFilters}
      >
        Limpar filtros
      </button>
    </div>
  ) : (
    <div className="admin-bookings-table-wrap">
      <table className="admin-bookings-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Sala</th>
            <th>Unidade</th>
            <th>Data</th>
            <th>Horário</th>
            {showBookingValue && <th>Valor</th>}
            <th>Pagamento</th>
            <th>Status</th>
            <th>Check-in</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {data.bookings.map((item) => {
            const paymentStatus = item.booking.paymentStatus ?? 'completed';
            const isAwaitingCheckIn =
              item.booking.date === data.today &&
              item.adminStatus === 'confirmed' &&
              !item.booking.checkedInAt;
            return (
              <tr
                key={item.booking.id}
                className={
                  [
                    item.adminStatus === 'pending' ? 'is-pending' : '',
                    isAwaitingCheckIn ? 'is-awaiting-checkin' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              >
                <td data-label="ID">
                  <code title={item.booking.id}>
                    {item.booking.id.length > 12
                      ? `${item.booking.id.slice(0, 10)}…`
                      : item.booking.id}
                  </code>
                </td>
                <td data-label="Cliente">
                  <strong>{item.clientName}</strong>
                </td>
                <td data-label="Sala">
                  <strong>
                    {isAwaitingCheckIn && (
                      <span
                        className="admin-bookings-arrival-dot"
                        title="Aguardando chegada hoje"
                      />
                    )}
                    {item.roomName}
                  </strong>
                </td>
                <td data-label="Unidade">{item.unitName}</td>
                <td data-label="Data">
                  <time dateTime={item.booking.date}>
                    {formatDate(item.booking.date)}
                  </time>
                </td>
                <td data-label="Horário">{item.booking.timeSlot}</td>
                {showBookingValue && (
                  <td data-label="Valor">
                    <strong>{money.format(item.total)}</strong>
                  </td>
                )}
                <td data-label="Pagamento">
                  {paymentStatus === 'pending' &&
                  item.adminStatus !== 'cancelled' ? (
                    <button
                      type="button"
                      className="admin-bookings-payment is-pending is-clickable is-action"
                      onClick={() => openPayment(item)}
                      disabled={data.isSaving}
                      title="Confirmar recebimento"
                    >
                      <CurrencyIcon width="14" height="14" />
                      Confirmar pagamento
                    </button>
                  ) : (
                    <span
                      className={`admin-bookings-payment is-${paymentStatus}`}
                    >
                      {paymentStatus === 'completed' ? 'Concluído' : 'Pendente'}
                    </span>
                  )}
                </td>
                <td data-label="Status">
                  {item.adminStatus === 'cancelled' ? (
                    <button
                      type="button"
                      className="admin-bookings-badge is-cancelled is-clickable"
                      onClick={() => setViewingReason(item)}
                      title="Ver motivo do cancelamento"
                    >
                      Cancelado
                    </button>
                  ) : (
                    <span
                      className={`admin-bookings-badge is-${item.adminStatus}`}
                    >
                      {statusLabels[item.adminStatus]}
                    </span>
                  )}
                </td>
                <td data-label="Check-in">
                  {item.adminStatus !== 'confirmed' ? (
                    <span className="admin-bookings-checkin-na">—</span>
                  ) : item.booking.checkedInAt ? (
                    <span className="admin-bookings-checkin is-completed">
                      <CheckIcon width="14" height="14" />
                      Chegou às {formatCheckInTime(item.booking.checkedInAt)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="admin-bookings-checkin is-action"
                      onClick={() => void checkIn(item)}
                      disabled={data.isSaving}
                    >
                      <UserIcon width="14" height="14" />
                      Check-in
                    </button>
                  )}
                </td>
                <td data-label="Ações">
                  <div className="admin-bookings-actions">
                    {item.adminStatus === 'pending' && (
                      <button
                        type="button"
                        className="is-confirm"
                        onClick={() => void confirm(item)}
                        disabled={data.isSaving}
                      >
                        <CheckIcon width="15" height="15" />
                        Confirmar
                      </button>
                    )}
                    {item.adminStatus !== 'cancelled' && (
                      <button
                        type="button"
                        className="is-cancel"
                        onClick={() => openCancellation(item)}
                        disabled={data.isSaving}
                      >
                        <CloseIcon width="15" height="15" />
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
