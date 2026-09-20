import { Link } from 'react-router-dom';
import { BuildingIcon, DoorIcon, PlusIcon } from '../components/icons';
import { DashboardOverview } from '../components/admin-dashboard/DashboardOverview';
import { DashboardAttention } from '../components/admin-dashboard/DashboardAttention';
import { DashboardSchedules } from '../components/admin-dashboard/DashboardSchedules';
import { MonthlyBookingsChart } from '../components/admin-dashboard/MonthlyBookingsChart';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { useAuth } from '../state/AuthContext';
import '../assets/css/pages/admin-dashboard.css';

export function AdminDashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useAdminDashboard();


  return <main className="admin-dashboard">
    <header className="admin-dashboard__intro">
      <div><h1>Dashboard</h1><p>Bom dia, {user?.name ?? 'Administrador'}</p></div>
      <nav className="admin-dashboard__shortcuts" aria-label="Ações rápidas">
        <Link to="/admin/agendamentos?novo=1"><PlusIcon width="21" height="21" />Nova reserva</Link>
        <Link to="/admin/salas"><DoorIcon width="21" height="21" />Gerenciar salas</Link>
        <Link to="/admin/unidades"><BuildingIcon width="21" height="21" />Gerenciar unidades</Link>
      </nav>
    </header>
    {error && <div className="admin-dashboard__error" role="alert"><span>{error}</span><button type="button" onClick={() => void reload()}>Tentar novamente</button></div>}

    <DashboardOverview data={data} isLoading={isLoading} />

    <section className="admin-command-grid" aria-label="Análise e pendências">
      {isLoading || !data ? <div className="admin-monthly-chart admin-skeleton admin-skeleton--chart" aria-label="Carregando gráfico" /> : <MonthlyBookingsChart months={data.monthlyBookings} units={data.chartUnits} />}
      <DashboardAttention data={data} />
    </section>

    <DashboardSchedules data={data} isLoading={isLoading} />
  </main>;
}
