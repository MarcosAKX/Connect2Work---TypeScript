import { useSearchParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { CalendarIcon, PlusIcon } from '../components/icons';
import { useAuth } from '../state/AuthContext';
import { useAdminBookingsPage } from '../hooks/useAdminBookingsPage';
import { money } from '../components/admin-bookings/formatters';
import { CancelBookingDialog } from '../components/admin-bookings/CancelBookingDialog';
import { CancellationReasonDialog } from '../components/admin-bookings/CancellationReasonDialog';
import { ConfirmPaymentDialog } from '../components/admin-bookings/ConfirmPaymentDialog';
import { CreateBookingDialog } from '../components/admin-bookings/CreateBookingDialog';
import { AdminBookingStats } from '../components/admin-bookings/AdminBookingStats';
import { AdminBookingFilters } from '../components/admin-bookings/AdminBookingFilters';
import { AdminBookingTable } from '../components/admin-bookings/AdminBookingTable';
import '../assets/css/pages/admin-bookings.css';
import '../assets/css/pages/admin-operations-polish.css';

export function AdminBookingsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const model = useAdminBookingsPage(user, searchParams);
  const {
    data,
    isAdmin,
    cancelling,
    viewingReason,
    creating,
    confirmingPayment,
    statusMessage,
  } = model;
  return (
    <main className="admin-bookings-page">
      {isAdmin && (
        <BackLink to="/admin/dashboard" label="Voltar ao Dashboard" />
      )}
      <header className="admin-bookings-page__intro">
        <div>
          <h1>
            <CalendarIcon width="31" height="31" />
            Gerenciar Agendamentos
          </h1>
          <p>Visualize e gerencie todos os agendamentos</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn--inline admin-bookings-new"
          onClick={() => model.setCreating(true)}
        >
          <PlusIcon width="15" height="15" />
          Novo Agendamento
        </button>
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
      {data.mutationError && !cancelling && !confirmingPayment && (
        <div className="admin-bookings-page__error" role="alert">
          <span>{data.mutationError}</span>
          <button type="button" onClick={data.clearMutationError}>
            Fechar
          </button>
        </div>
      )}
      <AdminBookingStats
        data={data}
        isAdmin={isAdmin}
        isSecretary={model.isSecretary}
      />
      <section
        className="admin-bookings-list"
        aria-labelledby="admin-bookings-list-title"
      >
        <header>
          <div>
            <h2 id="admin-bookings-list-title">Lista de Agendamentos</h2>
            <p>{data.bookings.length} agendamentos encontrados</p>
          </div>
          <div className="admin-bookings-list-summary">
            <span>
              <strong>{data.stats.confirmed}</strong> confirmados
            </span>
            <span>
              <strong>{data.stats.cancelled}</strong> cancelados
            </span>
            {isAdmin && (
              <span>
                <strong>{money.format(data.stats.revenue)}</strong> recebidos
              </span>
            )}
          </div>
        </header>
        <AdminBookingFilters data={data} />
        <AdminBookingTable
          data={data}
          showBookingValue={model.showBookingValue}
          openPayment={model.openPayment}
          openCancellation={model.openCancellation}
          setViewingReason={model.setViewingReason}
          checkIn={model.checkIn}
          confirm={model.confirm}
        />
      </section>
      {cancelling && (
        <CancelBookingDialog
          item={cancelling}
          isSaving={data.isSaving}
          gatewayError={data.mutationError}
          onClose={model.closeCancellation}
          onConfirm={model.cancel}
        />
      )}
      {viewingReason && (
        <CancellationReasonDialog
          item={viewingReason}
          onClose={() => model.setViewingReason(null)}
        />
      )}
      {confirmingPayment && (
        <ConfirmPaymentDialog
          item={confirmingPayment}
          isSaving={data.isSaving}
          error={data.mutationError}
          onClose={model.closePayment}
          onConfirm={model.confirmPayment}
        />
      )}
      <CreateBookingDialog
        open={creating}
        onClose={() => model.setCreating(false)}
        onCreated={model.onCreated}
      />
    </main>
  );
}
