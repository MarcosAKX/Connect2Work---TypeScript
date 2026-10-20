import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AdminRoute } from '../components/AdminRoute';
import './route-styles';
import { RouteLoading } from '../components/RouteLoading';

const AdminDashboardPage = lazy(() =>
  import('../features/dashboard/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })),
);
const AdminUnitsPage = lazy(() =>
  import('../features/unidades/AdminUnitsPage').then((module) => ({ default: module.AdminUnitsPage })),
);
const AdminRoomsPage = lazy(() =>
  import('../features/salas/AdminRoomsPage').then((module) => ({ default: module.AdminRoomsPage })),
);
const AdminBookingsPage = lazy(() =>
  import('../features/agendamentos/AdminBookingsPage').then((module) => ({ default: module.AdminBookingsPage })),
);
const AdminDailyPanelPage = lazy(() =>
  import('../features/painel-do-dia/AdminDailyPanelPage').then((module) => ({ default: module.AdminDailyPanelPage })),
);
const AdminUsersPage = lazy(() =>
  import('../features/usuarios/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })),
);
const AdminTasksPage = lazy(() =>
  import('../features/tarefas/AdminTasksPage').then((module) => ({ default: module.AdminTasksPage })),
);
const AdminHoursPlanPage = lazy(() =>
  import('../features/planos-horas/AdminHoursPlanPage').then((module) => ({ default: module.AdminHoursPlanPage })),
);
const BookingsPage = lazy(() =>
  import('../features/agendamentos/BookingsPage').then((module) => ({ default: module.BookingsPage })),
);
const BookingPage = lazy(() =>
  import('../features/agendamentos/BookingPage').then((module) => ({ default: module.BookingPage })),
);
const LoginPage = lazy(() =>
  import('../features/autenticacao/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const PaymentPage = lazy(() =>
  import('../features/pagamentos/PaymentPage').then((module) => ({ default: module.PaymentPage })),
);
const PaymentConfirmationPage = lazy(() =>
  import('../features/pagamentos/PaymentConfirmationPage').then((module) => ({ default: module.PaymentConfirmationPage })),
);
const RecoverPasswordPage = lazy(() =>
  import('../features/autenticacao/RecoverPasswordPage').then((module) => ({ default: module.RecoverPasswordPage })),
);
const RegisterPage = lazy(() =>
  import('../features/autenticacao/RegisterPage').then((module) => ({ default: module.RegisterPage })),
);
const RoomsPage = lazy(() =>
  import('../features/salas/RoomsPage').then((module) => ({ default: module.RoomsPage })),
);
const ServicesPage = lazy(() =>
  import('../features/servicos/ServicesPage').then((module) => ({ default: module.ServicesPage })),
);
const UnitsPage = lazy(() =>
  import('../features/unidades/UnitsPage').then((module) => ({ default: module.UnitsPage })),
);
const AdminActivityPage = lazy(() =>
  import('../features/auditoria/AdminActivityPage').then((module) => ({ default: module.AdminActivityPage })),
);
const AdminBackupPage = lazy(() =>
  import('../features/backup/AdminBackupPage').then((module) => ({ default: module.AdminBackupPage })),
);
const AdminBusinessServicesPage = lazy(() =>
  import('../features/servicos/AdminBusinessServicesPage').then((module) => ({ default: module.AdminBusinessServicesPage })),
);
const NotFoundPage = lazy(() =>
  import('./NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);

export function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/recuperar-senha" element={<RecoverPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/unidades" element={<UnitsPage />} />
          <Route path="/salas" element={<RoomsPage />} />
          <Route path="/agendamento" element={<BookingPage />} />
          <Route path="/pagamento" element={<PaymentPage />} />
          <Route path="/pagamento-confirmado" element={<PaymentConfirmationPage />} />
          <Route path="/meus-agendamentos" element={<BookingsPage />} />
          <Route path="/servicos" element={<ServicesPage />} />
        </Route>
        <Route element={<AdminRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/unidades" element={<AdminUnitsPage />} />
          <Route path="/admin/salas" element={<AdminRoomsPage />} />
          <Route path="/admin/usuarios" element={<AdminUsersPage />} />
          <Route path="/admin/atividades" element={<AdminActivityPage />} />
          <Route path="/admin/backup" element={<AdminBackupPage />} />
          <Route path="/admin/servicos" element={<AdminBusinessServicesPage />} />
        </Route>
        <Route element={<AdminRoute allowedRoles={['admin', 'secretaria']} />}>
          <Route path="/admin/painel-do-dia" element={<AdminDailyPanelPage />} />
          <Route path="/admin/agendamentos" element={<AdminBookingsPage />} />
          <Route path="/admin/tarefas" element={<AdminTasksPage />} />
          <Route path="/admin/planos-horas" element={<AdminHoursPlanPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/unidades" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
