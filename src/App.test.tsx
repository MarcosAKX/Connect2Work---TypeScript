import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { services } from './services';
import { createLocalStorageServices } from './services/local-storage';
import { AuthProvider } from './state/AuthContext';
import { ThemeProvider } from './state/ThemeContext';
import type { UserRole } from './types/domain';

function LocationProbe() {
  const location = useLocation();
  return <output data-location>{location.pathname}{location.search}</output>;
}

describe('App — rotas sob demanda e permissões', () => {
  let root: Root;
  let container: HTMLDivElement;
  const dialogMethods = {
    close: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close'),
    showModal: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal'),
  };
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    // jsdom does not implement native dialog methods; mirror their open state.
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true, value(this: HTMLDialogElement) { this.open = false; },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true, value(this: HTMLDialogElement) { this.open = true; },
    });
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('c2w_theme', 'dark');
    createLocalStorageServices();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    for (const method of ['close', 'showModal'] as const) {
      const descriptor = dialogMethods[method];
      if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, method, descriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, method);
    }
  });

  async function renderRoute(path: string, role: UserRole | null, state: unknown = null) {
    if (role) {
      const credentials = {
        client: ['teste@connect2work.com', '123456'],
        admin: ['admin@connect2work.com', 'admin123'],
        secretaria: ['secretaria@connect2work.com', 'secretaria123'],
      } as const;
      const [email, password] = credentials[role];
      await services.auth.login(email, password);
    }
    await act(async () => {
      root.render(<MemoryRouter initialEntries={[{ pathname: path.split('?')[0], search: path.includes('?') ? `?${path.split('?')[1]}` : '', state }]}>
        <ThemeProvider><AuthProvider><App /><LocationProbe /></AuthProvider></ThemeProvider>
      </MemoryRouter>);
    });
    await act(async () => { await vi.dynamicImportSettled(); });
  }

  it.each([
    ['/login', null, 'Bem-vindo de volta'],
    ['/cadastro', null, 'Criar Conta'],
    ['/recuperar-senha', null, 'Recuperar Senha'],
    ['/unidades', 'client', 'Escolha sua unidade'],
    ['/salas?unidade=unit-1', 'client', 'Salas disponíveis'],
    ['/agendamento?sala=room-1-1', 'client', 'Sala Executive'],
    ['/meus-agendamentos', 'client', 'Meus Agendamentos'],
    ['/servicos', 'client', 'Serviços para o seu negócio'],
    ['/admin', 'admin', 'Dashboard'],
    ['/admin/unidades', 'admin', 'Gerenciar Unidades'],
    ['/admin/salas', 'admin', 'Gerenciar Salas'],
    ['/admin/usuarios', 'admin', 'Gerenciar Usuários'],
    ['/admin/atividades', 'admin', 'Atividades e extratos'],
    ['/admin/backup', 'admin', 'Backup dos dados'],
    ['/admin/servicos', 'admin', 'Gerenciar Serviços'],
    ['/admin/agendamentos', 'admin', 'Gerenciar Agendamentos'],
    ['/admin/painel-do-dia', 'admin', 'Painel do Dia'],
    ['/admin/tarefas', 'admin', 'Tarefas'],
    ['/admin/planos-horas', 'admin', 'Planos de Horas'],
    ['/admin/agendamentos', 'secretaria', 'Gerenciar Agendamentos'],
    ['/admin/painel-do-dia', 'secretaria', 'Painel do Dia'],
    ['/admin/tarefas', 'secretaria', 'Tarefas'],
    ['/admin/planos-horas', 'secretaria', 'Planos de Horas'],
    ['/inexistente', null, 'Página não encontrada.'],
  ] as const)('abre %s para %s', async (path, role, heading) => {
    await renderRoute(path, role);
    expect(container.querySelector('h1')?.textContent).toBe(heading);
    expect(container.querySelector('[data-location]')?.textContent).toBe(path);
    if (role) expect(container.querySelector('header nav')).not.toBeNull();
  });

  it.each([
    ['/admin/usuarios', null, '/login', 'Bem-vindo de volta'],
    ['/agendamento?sala=room-1-1', null, '/login', 'Bem-vindo de volta'],
    ['/admin/backup', 'client', '/unidades', 'Escolha sua unidade'],
    ['/admin/usuarios', 'secretaria', '/admin/painel-do-dia', 'Painel do Dia'],
    ['/unidades', 'admin', '/admin', 'Dashboard'],
    ['/admin/dashboard', 'admin', '/admin', 'Dashboard'],
    ['/pagamento', 'client', '/unidades', 'Escolha sua unidade'],
    ['/pagamento-confirmado', 'client', '/meus-agendamentos', 'Meus Agendamentos'],
    ['/', null, '/login', 'Bem-vindo de volta'],
  ] as const)('preserva redirecionamento de %s para %s', async (path, role, destination, heading) => {
    await renderRoute(path, role);
    expect(container.querySelector('[data-location]')?.textContent).toBe(destination);
    expect(container.querySelector('h1')?.textContent).toBe(heading);
  });

  it('preserva estado da confirmação ao carregar a rota', async () => {
    await renderRoute('/pagamento-confirmado', 'client', {
      bookingId: 'test-confirmation', roomName: 'Sala Executive', unitName: 'Connect2Work 1',
      date: '2026-10-10', timeSlot: '09:00 - 10:00', duration: 1, total: 80,
    });
    expect(container.querySelector('h1')?.textContent).toBe('Agendamento confirmado!');
    expect(container.textContent).toContain('Sala Executive · Connect2Work 1');
    expect(container.textContent).toContain('09:00 - 10:00 (1 hora)');
  });

  it('abre checkout com o rascunho existente sem perder valores', async () => {
    const user = await services.auth.login('teste@connect2work.com', '123456');
    services.checkout.saveDraft({
      userId: user.id, unitId: 'unit-1', roomId: 'room-1-1', date: '2099-10-10',
      timeSlot: '09:00 - 10:00', duration: 1, total: 80,
    });
    await renderRoute('/pagamento', 'client');
    expect(container.querySelector('[data-location]')?.textContent).toBe('/pagamento');
    expect(container.querySelector('aside')?.textContent).toContain('Sala Executive');
    expect(container.querySelector('aside')?.textContent).toContain('09:00 - 10:00');
    expect(container.querySelector('aside')?.textContent).toMatch(/80,00/);
  });

  it('aplica filtros e abre nova reserva recebidos pela URL', async () => {
    await renderRoute('/admin/agendamentos?de=2026-09-01&ate=2026-09-30&unidade=unit-2&novo=1', 'admin');
    const dates = container.querySelectorAll<HTMLInputElement>('[role="search"] input[type="date"]');
    expect(dates[0]?.value).toBe('2026-09-01');
    expect(dates[1]?.value).toBe('2026-09-30');
    expect(container.querySelector<HTMLSelectElement>('[role="search"] select')?.value).toBe('unit-2');
    expect(container.querySelector('dialog[open] h2')?.textContent).toBe('Novo Agendamento');
  });

  it('navega entre páginas sem remontar o cabeçalho autenticado', async () => {
    await renderRoute('/meus-agendamentos', 'client');
    const header = container.querySelector('header');
    const link = container.querySelector<HTMLAnchorElement>('a[href="/servicos"]');
    if (!link) throw new Error('Link Serviços ausente');
    await act(async () => link.click());
    await act(async () => { await vi.dynamicImportSettled(); });
    expect(container.querySelector('h1')?.textContent).toBe('Serviços para o seu negócio');
    expect(container.querySelector('header')).toBe(header);
  });
});
