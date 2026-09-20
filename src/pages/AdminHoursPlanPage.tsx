import { Link } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon } from '../components/icons';
import { PlanDialog } from '../components/admin-hours-plan/PlanDialog';
import { RenewalDialog } from '../components/admin-hours-plan/RenewalDialog';
import { HoursPlanStats } from '../components/admin-hours-plan/HoursPlanStats';
import { HoursPlanFilters } from '../components/admin-hours-plan/HoursPlanFilters';
import { HoursPlanTable } from '../components/admin-hours-plan/HoursPlanTable';
import { useAdminHoursPlanPage } from '../hooks/useAdminHoursPlanPage';
import { useAuth } from '../state/AuthContext';
import '../assets/css/pages/admin-hours-plan.css';
import '../assets/css/pages/admin-operations-polish.css';

export function AdminHoursPlanPage() {
  const { user: currentUser } = useAuth();
  const { plan, editing, setEditing, renewing, setRenewing, save, renew } = useAdminHoursPlanPage();

  return (
    <main className="hours-plan-page">
      {currentUser?.role === 'admin' && (
        <Link to="/admin" className="page-back">
          <ArrowLeftIcon width="16" height="16" />Voltar ao Dashboard
        </Link>
      )}
      <header className="hours-plan-intro">
        <div>
          <h1><ClockIcon width="30" height="30" />Planos de Horas</h1>
          <p>Gerencie o saldo de horas dos usuários</p>
        </div>
      </header>
      {plan.notice && (
        <p className="hours-plan-notice" role="status">
          <CheckCircleIcon width="17" height="17" />{plan.notice}
        </p>
      )}
      {plan.error && !editing && !renewing && (
        <div className="hours-plan-page-error" role="alert">
          <span>{plan.error}</span>
          <button type="button" onClick={() => void plan.load()}>Tentar novamente</button>
        </div>
      )}
      <HoursPlanStats stats={plan.stats} />
      <section className="hours-plan-list">
        <header>
          <div><h2>Usuários e planos</h2><p>{plan.users.length} usuários encontrados</p></div>
          <HoursPlanFilters
            search={plan.search}
            setSearch={plan.setSearch}
            filter={plan.filter}
            setFilter={plan.setFilter}
          />
        </header>
        <HoursPlanTable plan={plan} setEditing={setEditing} setRenewing={setRenewing} />
      </section>
      {editing && (
        <PlanDialog
          user={editing}
          saving={plan.savingId === editing.id}
          error={plan.error}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {renewing && (
        <RenewalDialog
          user={renewing}
          saving={plan.savingId === renewing.id}
          error={plan.error}
          onClose={() => setRenewing(null)}
          onConfirm={renew}
        />
      )}
    </main>
  );
}
