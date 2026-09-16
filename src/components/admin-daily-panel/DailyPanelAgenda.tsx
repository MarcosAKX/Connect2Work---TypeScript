import { Link } from 'react-router-dom';
import { CalendarIcon, CheckIcon, ClockIcon, ArrowRightIcon } from '../icons';
import {
  getStartTime,
  getEndTime,
  formatCheckInTime,
} from '../../utils/daily-panel';
import type { AdminDailyPanelViewModel } from '../../hooks/useAdminDailyPanel';
export function DailyPanelAgenda({
  data,
  filteredTodayBookings,
  hasActiveFilters,
  clearFilters,
  openPayment,
  checkIn,
}: Pick<
  AdminDailyPanelViewModel,
  | 'data'
  | 'filteredTodayBookings'
  | 'hasActiveFilters'
  | 'clearFilters'
  | 'openPayment'
  | 'checkIn'
>) {
  return (
    <section className="admin-day-agenda" aria-labelledby="today-agenda-title">
      <header>
        <h2 id="today-agenda-title">Agenda de Hoje</h2>
        <span>{filteredTodayBookings.length} reservas</span>
      </header>
      {filteredTodayBookings.length === 0 ? (
        <div className="admin-day-empty">
          <CalendarIcon width="25" height="25" />
          <p>
            {data.dayPanel.todayBookings.length === 0
              ? 'Nenhum agendamento para hoje.'
              : 'Nenhuma reserva corresponde aos filtros.'}
          </p>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters}>
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="admin-day-agenda__table">
          <div className="admin-day-agenda__head">
            <span>Horário</span>
            <span>Sala</span>
            <span>Cliente</span>
            <span>Unidade</span>
            <span>Pagamento</span>
            <span>Check-in</span>
            <span>Ações</span>
          </div>
          <div className="admin-day-agenda__list">
            {filteredTodayBookings.map((item) => {
              const paymentPending =
                (item.booking.paymentStatus ?? 'completed') === 'pending' &&
                item.adminStatus !== 'cancelled';
              return (
                <article
                  key={item.booking.id}
                  className={`is-${item.adminStatus}`}
                >
                  <time
                    dateTime={`${item.booking.date}T${getStartTime(item.booking.timeSlot)}`}
                  >
                    <i aria-hidden="true" />
                    <strong>{getStartTime(item.booking.timeSlot)}</strong>
                    <small>{getEndTime(item.booking.timeSlot)}</small>
                  </time>
                  <div>
                    <strong>{item.roomName}</strong>
                    <span>Reserva ativa</span>
                  </div>
                  <div>
                    <strong>{item.clientName}</strong>
                    <span>Cliente</span>
                  </div>
                  <div>
                    <span>{item.unitName}</span>
                  </div>
                  <div
                    className={`admin-day-payment is-${paymentPending ? 'pending' : 'paid'}`}
                  >
                    <CheckIcon width="15" height="15" />
                    {paymentPending ? 'Pendente' : 'Pago'}
                  </div>
                  <div
                    className={`admin-day-checkin${item.booking.checkedInAt ? ' is-completed' : ''}`}
                  >
                    <ClockIcon width="15" height="15" />
                    <span>
                      {item.booking.checkedInAt
                        ? `Cliente chegou`
                        : item.adminStatus === 'confirmed'
                          ? 'Aguardando chegada'
                          : 'Não disponível'}
                      {item.booking.checkedInAt && (
                        <small>
                          {formatCheckInTime(item.booking.checkedInAt)}
                        </small>
                      )}
                    </span>
                  </div>
                  <div className="admin-day-action">
                    {paymentPending ? (
                      <button
                        type="button"
                        className="is-payment"
                        onClick={() => openPayment(item)}
                        disabled={data.isSaving}
                      >
                        Confirmar pagamento
                      </button>
                    ) : item.adminStatus === 'confirmed' &&
                      !item.booking.checkedInAt ? (
                      <button
                        type="button"
                        className="is-checkin"
                        onClick={() => void checkIn(item)}
                        disabled={data.isSaving}
                      >
                        Check-in
                      </button>
                    ) : (
                      <Link
                        to={`/admin/agendamentos?de=${data.today}&ate=${data.today}`}
                      >
                        Ver detalhes <ArrowRightIcon width="13" height="13" />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
      <Link
        className="admin-day-section-footer"
        to={`/admin/agendamentos?de=${data.today}&ate=${data.today}`}
      >
        Ver agenda completa <ArrowRightIcon width="15" height="15" />
      </Link>
    </section>
  );
}
