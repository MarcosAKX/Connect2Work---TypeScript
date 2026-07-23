import { useTheme } from '../state/ThemeContext';
import { MoonIcon, SunIcon } from './icons';

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro';

  return (
    <button
      type="button"
      className={`theme-toggle${className ? ` ${className}` : ''}`}
      onClick={toggleTheme}
      aria-label={nextThemeLabel}
      title={theme === 'dark' ? 'Modo escuro — ativar modo claro' : 'Modo claro — ativar modo escuro'}
    >
      {theme === 'dark' ? <MoonIcon width="18" height="18" /> : <SunIcon width="18" height="18" />}
    </button>
  );
}
