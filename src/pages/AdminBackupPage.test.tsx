import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { services } from '../services';
import { AuthProvider } from '../state/AuthContext';
import type { BackupPayload } from '../types/domain';
import { AdminBackupPage } from './AdminBackupPage';

const backup: BackupPayload = {
  schemaVersion: 3, exportedAt: '2026-09-20T12:00:00.000Z', credentialsIncluded: false,
  data: { users: [], units: [], rooms: [], bookings: [], tasks: [], auditLogs: [], hoursPlanTransactions: [] },
};

describe('AdminBackupPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  const createObjectURL = vi.fn(() => 'blob:test');
  const revokeObjectURL = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(services.auth, 'getCurrentUser').mockReturnValue({
      id: 'admin', name: 'Admin', email: 'admin@example.com', role: 'admin', active: true,
      createdAt: '2026-09-20', hasHoursPlan: false, hoursBalance: 0,
    });
    vi.spyOn(services.auth, 'logout').mockResolvedValue(undefined);
    vi.spyOn(services.backup, 'getLastBackupAt').mockResolvedValue(null);
    vi.spyOn(services.backup, 'exportData').mockResolvedValue(backup);
    vi.spyOn(services.backup, 'importData').mockResolvedValue(undefined);
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  async function mount() {
    await act(async () => root.render(<MemoryRouter><AuthProvider><AdminBackupPage /></AuthProvider></MemoryRouter>));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  async function click(selector: string) {
    await act(async () => element<HTMLButtonElement>(selector).click());
  }
  async function choose(text = JSON.stringify(backup), name = 'backup.json', size = 10) {
    const file = new File([], name);
    Object.defineProperties(file, { text: { value: async () => text }, size: { value: size } });
    const input = element<HTMLInputElement>('[type="file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  }
  async function confirm(value: string) {
    await act(async () => {
      const input = element<HTMLInputElement>('label input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  it('exporta pelo ator, cria download, atualiza data e remove aviso após 5s', async () => {
    await mount();
    expect(services.backup.getLastBackupAt).toHaveBeenCalledWith('admin');
    expect(container.textContent).toContain('Nenhum backup registrado');
    await click('.governance-primary');
    expect(services.backup.exportData).toHaveBeenCalledWith('admin');
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
    expect(element('[role="status"]').textContent).toBe('Backup criado e baixado.');
    expect(container.textContent).toContain('Último:');
    await act(async () => vi.advanceTimersByTime(5000));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
  it.each([
    ['texto', 'arquivo.txt', 10, 'Selecione um arquivo JSON.'],
    ['{}', 'arquivo.json', 20 * 1024 * 1024 + 1, 'O backup deve ter no máximo 20 MB.'],
    ['{', 'arquivo.json', 10, 'Arquivo JSON inválido.'],
  ] as const)('rejeita arquivo inválido %s/%s', async (text, name, size, message) => {
    await mount();
    await choose(text, name, size);
    expect(element('[role="alert"]').textContent).toBe(message);
    expect(services.backup.importData).not.toHaveBeenCalled();
  });
  it('exige confirmação exata, preserva erro do gateway e reinicia ao trocar arquivo', async () => {
    vi.mocked(services.backup.importData).mockRejectedValue(new Error('Backup incompatível'));
    await mount();
    await choose();
    expect(element<HTMLButtonElement>('.governance-danger').disabled).toBe(true);
    await confirm('restaurar');
    expect(element<HTMLButtonElement>('.governance-danger').disabled).toBe(true);
    await confirm('RESTAURAR');
    await click('.governance-danger');
    expect(services.backup.importData).toHaveBeenCalledWith(backup, 'admin');
    expect(element('[role="alert"]').textContent).toBe('Backup incompatível');
    expect(services.auth.logout).not.toHaveBeenCalled();
    await choose();
    expect(element<HTMLInputElement>('label input').value).toBe('');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
  it('restaura antes de encerrar sessão e navegar ao login', async () => {
    const assign = vi.fn();
    const realWindow = window;
    vi.stubGlobal('window', new Proxy(realWindow, {
      get(target, property) {
        return property === 'location' ? { assign } : Reflect.get(target, property);
      },
    }));
    await mount();
    await choose();
    await confirm('RESTAURAR');
    await click('.governance-danger');
    expect(services.backup.importData).toHaveBeenCalledWith(backup, 'admin');
    expect(services.auth.logout).toHaveBeenCalledOnce();
    expect(assign).toHaveBeenCalledWith('/login');
    expect(vi.mocked(services.backup.importData).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(services.auth.logout).mock.invocationCallOrder[0] ?? 0);
  });
  it('mostra falha de exportação e libera botão', async () => {
    vi.mocked(services.backup.exportData).mockRejectedValue(new Error('Falha de exportação'));
    await mount();
    await click('.governance-primary');
    expect(element('[role="alert"]').textContent).toBe('Falha de exportação');
    expect(element<HTMLButtonElement>('.governance-primary').disabled).toBe(false);
  });
});
