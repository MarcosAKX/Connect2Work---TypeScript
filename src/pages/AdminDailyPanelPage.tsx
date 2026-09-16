import { ClockIcon } from '../components/icons';
import { useAuth } from '../state/AuthContext';
import { useAdminDailyPanel } from '../hooks/useAdminDailyPanel';
import { formatLongDate } from '../utils/daily-panel';
import { DailyPanelMetrics } from '../components/admin-daily-panel/DailyPanelMetrics';
import { DailyPanelFilters } from '../components/admin-daily-panel/DailyPanelFilters';
import { DailyPanelAgenda } from '../components/admin-daily-panel/DailyPanelAgenda';
import { DailyPanelAttention } from '../components/admin-daily-panel/DailyPanelAttention';
import { DailyPanelUpcoming } from '../components/admin-daily-panel/DailyPanelUpcoming';
import { DailyConfirmPaymentDialog } from '../components/admin-daily-panel/DailyConfirmPaymentDialog';
import '../assets/css/pages/admin-bookings.css';
import '../assets/css/pages/admin-daily-panel.css';
import '../assets/css/pages/admin-operations-polish.css';

export function AdminDailyPanelPage() {
  const { user } = useAuth();
  const model = useAdminDailyPanel(user);
  const { data, statusMessage, confirmingPayment, currentTime } = model;
  return (
    <main className="admin-daily-page">
      <header className="admin-daily-page__intro">
        <div>
          <h1>Painel do Dia</h1>
          <p>
            <span>{formatLongDate(data.today)}</span>
            <i aria-hidden="true" />
            <ClockIcon width="16" height="16" />
            Agora <strong>{currentTime}</strong>
          </p>
        </div>
      </header>
      {statusMessage && (
        <p className="admin-bookings-page__status" role="status">
          {statusMessage}
        </p>
      )}
      {data.error && (
        <div className="admin-bookings-page__error" role="alert">
          <span>{data.error}</span>
          <button type="button" onClick={() => void data.reload()}>
            Tentar novamente
          </button>
        </div>
      )}
      {data.mutationError && !confirmingPayment && (
        <div className="admin-bookings-page__error" role="alert">
          <span>{data.mutationError}</span>
          <button type="button" onClick={data.clearMutationError}>
            Fechar
          </button>
        </div>
      )}

      <DailyPanelMetrics data={model.data} />

      <section className="admin-day-panel" aria-labelledby="today-agenda-title">
        <DailyPanelFilters
          data={model.data}
          search={model.search}
          setSearch={model.setSearch}
          unitId={model.unitId}
          setUnitId={model.setUnitId}
          operationalFilter={model.operationalFilter}
          setOperationalFilter={model.setOperationalFilter}
          periodFilter={model.periodFilter}
          setPeriodFilter={model.setPeriodFilter}
          hasActiveFilters={model.hasActiveFilters}
          clearFilters={model.clearFilters}
        />

        <div className="admin-day-workspace">
          <DailyPanelAgenda
            data={model.data}
            filteredTodayBookings={model.filteredTodayBookings}
            hasActiveFilters={model.hasActiveFilters}
            clearFilters={model.clearFilters}
            openPayment={model.openPayment}
            checkIn={model.checkIn}
          />

          <div className="admin-day-side">
            <DailyPanelAttention
              attentionCount={model.attentionCount}
              firstPendingPayment={model.firstPendingPayment}
              firstWaitingArrival={model.firstWaitingArrival}
              openPayment={model.openPayment}
              checkIn={model.checkIn}
            />

            <DailyPanelUpcoming
              data={model.data}
              upcomingDays={model.upcomingDays}
            />
          </div>
        </div>
      </section>
      {confirmingPayment && (
        <DailyConfirmPaymentDialog
          item={confirmingPayment}
          isSaving={data.isSaving}
          error={data.mutationError}
          onClose={model.closePayment}
          onConfirm={model.confirmPayment}
        />
      )}
    </main>
  );
}
