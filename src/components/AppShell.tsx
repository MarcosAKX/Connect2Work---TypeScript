import { IntegrationPending } from './IntegrationPending';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, useState } from 'react';
import { RouteLoading } from './RouteLoading';
import { useAuth } from '../state/AuthContext';
import logo from '../assets/img/cwlogo.ico';
import { UserIcon } from './icons';
import { ThemeToggle } from './ThemeToggle';

export function AppShell({ blocked = false }: { blocked?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLeaving, setIsLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  async function handleLogout() {
    setIsLeaving(true); setLogoutError('');
    try {
      await logout();
      navigate('/login', { replace: true, state: { from: location.pathname } });
    } catch {
      setLogoutError('Não foi possível encerrar a sessão. Tente novamente.');
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <>
      <header className="app-header">
        <NavLink to="/unidades" className="app-logo" aria-label="Página inicial da Connect2Work">
          <img src={logo} alt="" />
        </NavLink>
        <nav className="app-nav" aria-label="Navegação principal">
          <NavLink to="/unidades" className={({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`}>Unidades</NavLink>
          <NavLink to="/meus-agendamentos" className={({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`}>Meus Agendamentos</NavLink>
          <NavLink to="/servicos" className={({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`}>Serviços</NavLink>
        </nav>
        <div className="app-user">
          <span className="app-user-identity">
            <UserIcon className="app-user-icon" width="16" height="16" />
            <span className="app-user-name">{user?.name ?? 'Usuário'}</span>
          </span>
          <ThemeToggle />
          <div className="logout-status"><button type="button" className="app-logout" onClick={handleLogout} disabled={isLeaving} aria-label="Sair da conta">
            {isLeaving ? 'Saindo...' : 'Sair'}
          </button>{logoutError && <p className="auth-shell-error" role="alert">{logoutError}</p>}</div>
        </div>
      </header>
      <Suspense fallback={<RouteLoading />}>{blocked ? <IntegrationPending /> : <Outlet />}</Suspense>
    </>
  );
}
