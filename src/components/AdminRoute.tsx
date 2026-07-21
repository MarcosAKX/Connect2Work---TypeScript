import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { AdminShell } from './AdminShell';

export function AdminRoute() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/unidades" replace />;

  return <AdminShell />;
}
