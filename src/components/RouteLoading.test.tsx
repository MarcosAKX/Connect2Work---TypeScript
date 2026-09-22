import { act, lazy, Suspense, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { services } from '../services';
import { AuthProvider } from '../state/AuthContext';
import { ThemeProvider } from '../state/ThemeContext';
import { AppShell } from './AppShell';
import { AdminShell } from './AdminShell';
import { ErrorBoundary } from './ErrorBoundary';

describe('carregamento de rotas', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    localStorage.setItem('c2w_theme', 'dark');
    vi.spyOn(services.auth, 'getCurrentUser').mockReturnValue({
      id: 'staff', name: 'Equipe', email: 'staff@example.com', role: 'admin',
      active: true, createdAt: '2026-09-21', hasHoursPlan: false, hoursBalance: 0,
    });
    vi.spyOn(services.tasks, 'listTasks').mockResolvedValue([]);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([['cliente', AppShell], ['equipe', AdminShell]] as const)('mantém o cabeçalho de %s durante download da página', async (_name, Shell) => {
    let finish!: (module: { default: ComponentType }) => void;
    const Page = lazy(() => new Promise<{ default: ComponentType }>((resolve) => { finish = resolve; }));
    await act(async () => root.render(
      <ThemeProvider><AuthProvider><MemoryRouter>
        <Suspense fallback={null}><Routes>
          <Route element={<Shell />}><Route path="/" element={<Page />} /></Route>
        </Routes></Suspense>
      </MemoryRouter></AuthProvider></ThemeProvider>,
    ));
    expect(container.querySelector('header')).not.toBeNull();
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Carregando');
    await act(async () => finish({ default: () => <h1>Conteúdo disponível</h1> }));
    expect(container.querySelector('h1')?.textContent).toBe('Conteúdo disponível');
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('header')).not.toBeNull();
  });

  it('oferece recuperação se o download da página falhar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Page = lazy(() => Promise.reject(new Error('Falha ao baixar módulo')));
    await act(async () => root.render(
      <ErrorBoundary><Suspense fallback={null}><Page /></Suspense></ErrorBoundary>,
    ));
    expect(container.querySelector('h1')?.textContent).toBe('A tela encontrou um problema.');
    expect(container.querySelector('button')?.textContent).toBe('Recarregar aplicação');
  });
});
