import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { AppShell } from './AppShell';
import { AuthRouteStatus } from './AuthRouteStatus';
export function ProtectedRoute() {
  const { user, status, error, refreshUser, mode } = useAuth();
  const { pathname } = useLocation();
  if (status === 'checking' || status === 'error') return <AuthRouteStatus status={status} error={error} onRetry={refreshUser} />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to={mode === 'http' ? '/admin/usuarios' : '/admin'} replace />;
  const blocked = mode === 'http' && !['/unidades', '/salas', '/servicos', '/agendamento', '/meus-agendamentos'].includes(pathname);
  return <AppShell blocked={blocked} />;
}

