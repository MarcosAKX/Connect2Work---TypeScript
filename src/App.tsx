import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import './route-styles';
import { RouteLoading } from './components/RouteLoading';

const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })),
);
const AdminUnitsPage = lazy(() =>
  import('./pages/AdminUnitsPage').then((module) => ({ default: module.AdminUnitsPage })),
);
const AdminRoomsPage = lazy(() =>
  import('./pages/AdminRoomsPage').then((module) => ({ default: module.AdminRoomsPage })),
);
const AdminBookingsPage = lazy(() =>
  import('./pages/AdminBookingsPage').then((module) => ({ default: module.AdminBookingsPage })),
);
const AdminDailyPanelPage = lazy(() =>
  import('./pages/AdminDailyPanelPage').then((module) => ({ default: module.AdminDailyPanelPage })),
);
const AdminUsersPage = lazy(() =>
  import('./pages/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })),
);
const AdminTasksPage = lazy(() =>
  import('./pages/AdminTasksPage').then((module) => ({ default: module.AdminTasksPage })),
);
const AdminHoursPlanPage = lazy(() =>
  import('./pages/AdminHoursPlanPage').then((module) => ({ default: module.AdminHoursPlanPage })),
);
const BookingsPage = lazy(() =>
  import('./pages/BookingsPage').then((module) => ({ default: module.BookingsPage })),
);
const BookingPage = lazy(() =>
  import('./pages/BookingPage').then((module) => ({ default: module.BookingPage })),
);
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const PaymentPage = lazy(() =>
  import('./pages/PaymentPage').then((module) => ({ default: module.PaymentPage })),
);
const PaymentConfirmationPage = lazy(() =>
  import('./pages/PaymentConfirmationPage').then((module) => ({ default: module.PaymentConfirmationPage })),
);
const RecoverPasswordPage = lazy(() =>
  import('./pages/RecoverPasswordPage').then((module) => ({ default: module.RecoverPasswordPage })),
);
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
);
const RoomsPage = lazy(() =>
  import('./pages/RoomsPage').then((module) => ({ default: module.RoomsPage })),
);
const ServicesPage = lazy(() =>
  import('./pages/ServicesPage').then((module) => ({ default: module.ServicesPage })),
);
const UnitsPage = lazy(() =>
  import('./pages/UnitsPage').then((module) => ({ default: module.UnitsPage })),
);
const AdminActivityPage = lazy(() =>
  import('./pages/AdminActivityPage').then((module) => ({ default: module.AdminActivityPage })),
);
const AdminBackupPage = lazy(() =>
  import('./pages/AdminBackupPage').then((module) => ({ default: module.AdminBackupPage })),
);
const AdminBusinessServicesPage = lazy(() =>
  import('./pages/AdminBusinessServicesPage').then((module) => ({ default: module.AdminBusinessServicesPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
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
