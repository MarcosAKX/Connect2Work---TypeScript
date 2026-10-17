import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { AdminShell } from './AdminShell';
import { AuthRouteStatus } from './AuthRouteStatus';
import type { UserRole } from '../types/domain';
export function AdminRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { user, status, error, refreshUser, mode } = useAuth();
  if (status === 'checking' || status === 'error') return <AuthRouteStatus status={status} error={error} onRetry={refreshUser} />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={user.role === 'secretaria' ? '/admin/painel-do-dia' : '/unidades'} replace />;
  return <AdminShell blocked={mode === 'http'} />;
}
