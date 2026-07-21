import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminUnitsPage } from './pages/AdminUnitsPage';
import { BookingsPage } from './pages/BookingsPage';
import { BookingPage } from './pages/BookingPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentPage } from './pages/PaymentPage';
import { PaymentConfirmationPage } from './pages/PaymentConfirmationPage';
import { RecoverPasswordPage } from './pages/RecoverPasswordPage';
import { RegisterPage } from './pages/RegisterPage';
import { RoomsPage } from './pages/RoomsPage';
import { ServicesPage } from './pages/ServicesPage';
import { UnitsPage } from './pages/UnitsPage';

export function App() {
  return (
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
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
        <Route path="/admin/unidades" element={<AdminUnitsPage />} />
        {/* Futuras rotas: /admin/salas e /admin/agendamentos. */}
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
      </Route>
      <Route path="/" element={<Navigate to="/unidades" replace />} />
      <Route path="*" element={<Navigate to="/unidades" replace />} />
    </Routes>
  );
}
