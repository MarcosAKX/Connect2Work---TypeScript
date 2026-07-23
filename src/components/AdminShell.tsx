import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import logo from '../assets/img/cwlogo.ico';
import { useAuth } from '../state/AuthContext';
import { BuildingIcon, CalendarIcon, DashboardIcon, DoorIcon, MenuIcon, UserIcon } from './icons';
import { AdminSidebar } from './AdminSidebar';

const adminNavigation = [
  { to: '/admin', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/admin/unidades', label: 'Unidades', icon: BuildingIcon, end: false },
  { to: '/admin/salas', label: 'Salas', icon: DoorIcon, end: false },
  { to: '/admin/agendamentos', label: 'Agendamentos', icon: CalendarIcon, end: false },
] as const;

export function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  async function handleLogout() {
    setIsLeaving(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <>
      <header className="admin-header">
        <div className="admin-brand">
          <button type="button" className="admin-menu-button" aria-label="Abrir ferramentas administrativas" aria-controls="admin-sidebar" aria-expanded={isSidebarOpen} onClick={() => setIsSidebarOpen(true)}>
            <MenuIcon width="20" height="20" />
          </button>
          <NavLink to="/admin" className="admin-brand__logo" aria-label="Dashboard administrativo da Connect2Work">
            <img src={logo} alt="" />
          </NavLink>
          <span className="admin-brand__badge">Admin</span>
        </div>

        <nav className="admin-nav" aria-label="Navegação administrativa">
          {adminNavigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `admin-nav__link${isActive ? ' is-active' : ''}`}>
              <Icon width="17" height="17" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-account">
          <span className="admin-account__identity"><UserIcon width="16" height="16" />{user?.name ?? 'Administrador'}</span>
          <button type="button" className="admin-account__logout" onClick={handleLogout} disabled={isLeaving}>
            {isLeaving ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      </header>
      <AdminSidebar open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <Outlet />
    </>
  );
}
