import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme(): void;
}

const STORAGE_KEY = 'c2w_theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const initial = getInitialTheme();
    document.documentElement.dataset.theme = initial;
    return initial;
  });

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    toggleTheme() {
      setTheme((current) => {
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        localStorage.setItem(STORAGE_KEY, next);
        return next;
      });
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme deve ser usado dentro de ThemeProvider.');
  return value;
}
