import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { CloseIcon, UsersIcon } from './icons';
import '../assets/css/admin-sidebar.css';
import type { UserRole } from '../types/domain';

const administrativeTools = [
  { to: '/admin/usuarios', label: 'Gerenciar Usuários', icon: UsersIcon, roles: ['admin'] },
] satisfies Array<{ to: string; label: string; icon: typeof UsersIcon; roles: UserRole[] }>;

interface AdminSidebarProps {
  open: boolean;
  hoverMode: boolean;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  role: UserRole;
}

export function AdminSidebar({ open, hoverMode, onClose, onMouseEnter, onMouseLeave, role }: AdminSidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    if (!hoverMode) {
      document.body.style.overflow = 'hidden';
      closeButtonRef.current?.focus();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      if (!hoverMode) document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [hoverMode, open, onClose]);

  return (
    <div className={`admin-sidebar-layer${open ? ' is-open' : ''}${hoverMode ? ' is-hover-mode' : ''}`} aria-hidden={!open}>
      <button type="button" className="admin-sidebar-overlay" aria-label="Fechar menu administrativo" onClick={onClose} tabIndex={open ? 0 : -1} />
      <aside id="admin-sidebar" className="admin-sidebar" aria-label="Ferramentas administrativas" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <header>
          <div>
            <span>Administração</span>
            <strong>Ferramentas</strong>
          </div>
          <button ref={closeButtonRef} type="button" aria-label="Fechar menu" onClick={onClose} tabIndex={open ? 0 : -1}>
            <CloseIcon width="20" height="20" />
          </button>
        </header>
        <nav aria-label="Ferramentas administrativas">
          <p>Ferramentas Administrativas</p>
          {administrativeTools.filter((item) => (item.roles as UserRole[]).includes(role)).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'is-active' : ''} onClick={onClose} tabIndex={open ? 0 : -1}>
              <Icon width="19" height="19" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  );
}
