import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { AppShell } from './AppShell';

export function ProtectedRoute() {
  const { user } = useAuth();
  return user ? <AppShell /> : <Navigate to="/login" replace />;
}
