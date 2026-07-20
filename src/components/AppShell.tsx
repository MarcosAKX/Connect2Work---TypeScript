import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../state/AuthContext';
import { UserIcon } from './icons';

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLeaving, setIsLeaving] = useState(false);

  async function handleLogout() {
    setIsLeaving(true);
    try {
      await logout();
      navigate('/login', { replace: true, state: { from: location.pathname } });
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <>
      <header className="app-header">
        <NavLink to="/unidades" className="app-logo" aria-label="C2W Connect2Work">C2W</NavLink>
        <nav className="app-nav" aria-label="Navegação principal">
          <NavLink to="/unidades" className={({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`}>Unidades</NavLink>
          <NavLink to="/meus-agendamentos" className={({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`}>Meus Agendamentos</NavLink>
          <NavLink to="/servicos" className={({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`}>Serviços</NavLink>
        </nav>
        <div className="app-user">
          <UserIcon className="app-user-icon" width="16" height="16" />
          <span className="app-user-name">{user?.name ?? 'Usuário'}</span>
          <button type="button" className="app-logout" onClick={handleLogout} disabled={isLeaving} aria-label="Sair da conta">
            {isLeaving ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </header>
      <Outlet />
    </>
  );
}
