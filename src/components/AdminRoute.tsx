import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { AdminShell } from './AdminShell';

export function AdminRoute() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  // TODO: definir permissões e rotas da role "secretaria" quando o escopo for aprovado.
  // Até lá, inclusive /admin/usuarios permanece exclusivamente administrativo.
  if (user.role !== 'admin') return <Navigate to="/unidades" replace />;

  return <AdminShell />;
}
