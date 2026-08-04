import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

interface PublicAuthLayoutProps {
  children: ReactNode;
  labelledBy: string;
  pageClassName?: string;
}

export function PublicAuthLayout({ children, labelledBy, pageClassName = '' }: PublicAuthLayoutProps) {
  const className = `login-page login-page--split${pageClassName ? ` ${pageClassName}` : ''}`;

  return (
    <main className={className}>
      <section className="login-visual" aria-label="Fachada da Connect2Work">
        <div className="login-visual__logo" aria-label="Connect2Work"><span>C2</span><b>W</b></div>
        <div className="login-visual__message">
          <strong>Seu espaço. Seu ritmo.</strong>
          <span>Salas e soluções para trabalhar melhor.</span>
        </div>
      </section>

      <section className="login-panel" aria-labelledby={labelledBy}>
        <ThemeToggle className="login-theme-toggle" />
        {children}
      </section>
    </main>
  );
}
