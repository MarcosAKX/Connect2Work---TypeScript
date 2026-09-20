import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { services } from '../services';
import { AuthProvider } from '../state/AuthContext';
import type { User } from '../types/domain';
import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(services.auth, 'getCurrentUser').mockReturnValue(null);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it.each([
    [null, '/login'],
    ['client', '/unidades'],
    ['admin', '/admin'],
    ['secretaria', '/admin/painel-do-dia'],
  ] as const)('retorna perfil %s para %s', async (role, destination) => {
    if (role) {
      const user: User = {
        id: 'test', name: 'Teste', email: 'teste@example.com', role, active: true,
        createdAt: '2026-09-20', hasHoursPlan: false, hoursBalance: 0,
      };
      vi.mocked(services.auth.getCurrentUser).mockReturnValue(user);
    }
    await act(async () => root.render(
      <MemoryRouter initialEntries={['/rota-inexistente']}><AuthProvider><Routes>
        <Route path={destination} element={<p>Destino correto</p>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes></AuthProvider></MemoryRouter>,
    ));
    expect(container.querySelector('h1')?.textContent).toBe('Página não encontrada.');
    expect(container.textContent).toContain('Erro 404');
    const link = container.querySelector('a');
    if (!link) throw new Error('Link de retorno ausente');
    expect(link.textContent).toBe('Voltar para o início');
    expect(link.getAttribute('href')).toBe(destination);
    await act(async () => link.click());
    expect(container.textContent).toBe('Destino correto');
  });
});
