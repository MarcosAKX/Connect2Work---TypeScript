import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { useLogin } from '../useLogin';
import { AdminDashboardPage } from '../../dashboard/AdminDashboardPage';

const auth = vi.hoisted(() => ({ mode: 'http', user: { role: 'admin', name: 'Admin' }, login: vi.fn() }));
vi.mock('../../../state/AuthContext', () => ({ useAuth: () => auth }));
const data = vi.hoisted(() => ({ units: vi.fn() }));
vi.mock('../../../services', () => ({ services: { catalog: { getUnits: data.units } } }));
let model: ReturnType<typeof useLogin>;
function Probe() { model = useLogin(); const location = useLocation(); return <><output>{location.pathname}</output><form onSubmit={event => { void model.handleSubmit(event); }} /></>; }
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
it('admin entra no dashboard com sessão existente ou após login por senha', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div'); const root = createRoot(container);
  auth.login.mockResolvedValue(auth.user);
  try {
    await act(async () => root.render(<MemoryRouter initialEntries={['/login']}><Probe /></MemoryRouter>));
    expect(model.destination).toBe('/admin');
    await act(async () => { model.setEmail('admin@example.invalid'); model.setPassword('teste123'); });
    await act(async () => { container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(container.textContent).toBe('/admin');
  } finally { await act(async () => root.unmount()); }
});
it('dashboard HTTP identifica a integração pendente sem consultar dados de demonstração', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div'); const root = createRoot(container);
  try {
    await act(async () => root.render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>));
    expect(container.querySelector('h1')?.textContent).toBe('Dashboard');
    expect(container.querySelector('[role="status"]')?.textContent).toContain('integração');
    expect(data.units).not.toHaveBeenCalled();
  } finally { await act(async () => root.unmount()); }
});
