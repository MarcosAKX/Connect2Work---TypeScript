import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { AdminShell } from './AdminShell';
import type { UserRole } from '../types/domain';

export function AdminRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'secretaria' ? '/admin/painel-do-dia' : '/unidades'} replace />;
  }

  return <AdminShell />;
}
