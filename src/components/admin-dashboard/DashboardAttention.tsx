import type { AdminDashboardData } from '../../hooks/useAdminDashboard';
import { Link } from 'react-router-dom';
import { CreditCardIcon, ClockIcon, TaskIcon, ArrowRightIcon } from '../icons';

export function DashboardAttention({ data }: { data: AdminDashboardData | null }) {
  return (
      <aside className="admin-attention" aria-labelledby="admin-attention-title">
        <header><h2 id="admin-attention-title">Precisa de atenção</h2></header>
        <div className="admin-attention__list">
          <article>
            <span className="admin-attention__icon is-danger"><CreditCardIcon width="20" height="20" /></span>
            <div>
              <strong>{data?.pendingPaymentCount ?? 0} pagamentos pendentes</strong>
              <small>Total: {data?.pendingPaymentCount ?? 0} reservas</small>
            </div>
            <Link to="/admin/agendamentos">Ver pagamentos <ArrowRightIcon width="14" height="14" /></Link>
          </article>
          <article>
            <span className="admin-attention__icon is-danger"><ClockIcon width="20" height="20" /></span>
            <div>
              <strong>{data?.awaitingArrivalTodayCount ?? 0} chegadas aguardadas</strong>
              <small>Confirmadas e sem check-in hoje</small>
            </div>
            <Link to="/admin/painel-do-dia">Ver reservas <ArrowRightIcon width="14" height="14" /></Link>
          </article>
          <article>
            <span className="admin-attention__icon is-info"><TaskIcon width="20" height="20" /></span>
            <div>
              <strong>{data?.attentionTaskCount ?? 0} tarefas para hoje</strong>
              <small>Vencidas ou com prazo hoje</small>
            </div>
            <Link to="/admin/tarefas">Ver tarefas <ArrowRightIcon width="14" height="14" /></Link>
          </article>
        </div>
      </aside>
  );
}
