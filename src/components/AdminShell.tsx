import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import logo from '../assets/img/cwlogo.ico';
import { useAuth } from '../state/AuthContext';
import { BuildingIcon, CalendarIcon, DashboardIcon, DoorIcon, MenuIcon, TaskIcon, UserIcon } from './icons';
import { AdminSidebar } from './AdminSidebar';
import { ThemeToggle } from './ThemeToggle';
import type { UserRole } from '../types/domain';
import { useTaskAttentionCount } from '../hooks/useAdminTasks';

const adminNavigation = [
  { to: '/admin/agendamentos', label: 'Agendamentos', icon: CalendarIcon, end: false, roles: ['admin', 'secretaria'] },
  { to: '/admin', label: 'Dashboard', icon: DashboardIcon, end: true, roles: ['admin'] },
  { to: '/admin/painel-do-dia', label: 'Painel do Dia', icon: DashboardIcon, end: false, roles: ['admin', 'secretaria'] },
  { to: '/admin/salas', label: 'Salas', icon: DoorIcon, end: false, roles: ['admin'] },
  { to: '/admin/tarefas', label: 'Tarefas', icon: TaskIcon, end: false, roles: ['admin', 'secretaria'] },
  { to: '/admin/unidades', label: 'Unidades', icon: BuildingIcon, end: false, roles: ['admin'] },
] satisfies Array<{ to: string; label: string; icon: typeof DashboardIcon; end: boolean; roles: UserRole[] }>;

export function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarHoverMode, setIsSidebarHoverMode] = useState(false);
  const hoverModeRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const role = user?.role ?? 'client';
  const taskAttentionCount = useTaskAttentionCount();
  const visibleNavigation = adminNavigation.filter((item) => (item.roles as UserRole[]).includes(role));

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  function cancelScheduledClose() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openSidebarByHover() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    cancelScheduledClose();
    hoverModeRef.current = true;
    setIsSidebarHoverMode(true);
    setIsSidebarOpen(true);
  }

  function openSidebarByClick() {
    cancelScheduledClose();
    hoverModeRef.current = false;
    setIsSidebarHoverMode(false);
    setIsSidebarOpen(true);
  }

  function scheduleHoverClose() {
    if (!hoverModeRef.current) return;
    cancelScheduledClose();
    closeTimerRef.current = window.setTimeout(() => {
      setIsSidebarOpen(false);
      setIsSidebarHoverMode(false);
      hoverModeRef.current = false;
    }, 220);
  }

  function closeSidebar() {
    cancelScheduledClose();
    setIsSidebarOpen(false);
    setIsSidebarHoverMode(false);
    hoverModeRef.current = false;
  }

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
          {(role === 'admin' || role === 'secretaria') && <button type="button" className="admin-menu-button" aria-label="Abrir ferramentas administrativas" aria-controls="admin-sidebar" aria-expanded={isSidebarOpen} onMouseEnter={openSidebarByHover} onMouseLeave={scheduleHoverClose} onClick={openSidebarByClick}>
            <MenuIcon width="20" height="20" />
          </button>}
          <NavLink to={role === 'secretaria' ? '/admin/painel-do-dia' : '/admin'} className="admin-brand__logo" aria-label="Área administrativa da Connect2Work">
            <img src={logo} alt="" />
          </NavLink>
          <span className="admin-brand__badge">{role === 'secretaria' ? 'Secretaria' : 'Admin'}</span>
        </div>

        <nav className="admin-nav" aria-label="Navegação administrativa">
          {visibleNavigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `admin-nav__link${isActive ? ' is-active' : ''}`}>
              <Icon width="17" height="17" />
              <span>{label}</span>
              {to === '/admin/tarefas' && taskAttentionCount > 0 && <strong className="admin-task-menu-badge" aria-label={`${taskAttentionCount} tarefas vencidas ou vencendo hoje`}>{taskAttentionCount}</strong>}
            </NavLink>
          ))}
        </nav>

        <div className="admin-account">
          <span className="admin-account__identity"><UserIcon width="16" height="16" />{user?.name ?? 'Administrador'}</span>
          <ThemeToggle />
          <button type="button" className="admin-account__logout" onClick={handleLogout} disabled={isLeaving}>
            {isLeaving ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      </header>
      <AdminSidebar open={isSidebarOpen} hoverMode={isSidebarHoverMode} onMouseEnter={cancelScheduledClose} onMouseLeave={scheduleHoverClose} onClose={closeSidebar} role={role} taskAttentionCount={taskAttentionCount} />
      <Outlet />
    </>
  );
}
