import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useSessionActivity } from '../useSessionActivity';
import type { AuthSession } from '../../services/contracts';
const user = { id: 'uuid', name: 'Maria Silva', email: 'maria@example.com', role: 'client' as const, active: true, createdAt: '2026-10-11', hasHoursPlan: false, hoursBalance: 0 };
describe('atividade real de sessão', () => {
  let root: Root; let container: HTMLDivElement;
  const activity = vi.fn<() => Promise<void>>(); const check = vi.fn<() => Promise<void>>();
  let session: AuthSession;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-11T12:00:00Z'));
    activity.mockReset().mockResolvedValue(); check.mockReset().mockResolvedValue();
    session = { user, idleExpiresAt: '2026-10-11T12:15:00Z', absoluteExpiresAt: '2026-10-11T16:00:00Z' };
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  function Probe({ enabled = true, trusted = true }: { enabled?: boolean; trusted?: boolean }) {
    useSessionActivity({ enabled, session, onActivity: activity, onCheck: check, acceptEvent: event => trusted || event.isTrusted });
    return null;
  }
  async function render(props: { enabled?: boolean; trusted?: boolean } = {}) { await act(async () => root.render(<Probe {...props} />)); }
  async function gesture() { await act(async () => document.dispatchEvent(new Event('pointerdown'))); }
  it('não envia heartbeat em aba parada, mas consulta ao atingir limite', async () => {
    await render(); await act(async () => vi.advanceTimersByTimeAsync(900000));
    expect(activity).not.toHaveBeenCalled(); expect(check).toHaveBeenCalledOnce();
  });
  it('coalesce interações a no máximo uma atualização por minuto', async () => {
    await render(); await gesture(); await gesture(); expect(activity).toHaveBeenCalledOnce();
    await act(async () => vi.advanceTimersByTimeAsync(59999)); expect(activity).toHaveBeenCalledOnce();
    await act(async () => vi.advanceTimersByTimeAsync(1)); expect(activity).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(60000)); expect(activity).toHaveBeenCalledTimes(2);
  });
  it('aba oculta ou evento sintético não renova atividade; retorno consulta sem renovar', async () => {
    await render({ trusted: false }); await gesture(); expect(activity).not.toHaveBeenCalled();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await render(); await gesture(); expect(activity).not.toHaveBeenCalled();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(check).toHaveBeenCalledOnce(); expect(activity).not.toHaveBeenCalled();
  });
  it('limite absoluto prevalece e desabilitar cancela listeners/timers', async () => {
    session = { ...session, idleExpiresAt: '2026-10-11T16:00:00Z' };
    await render(); await act(async () => vi.advanceTimersByTimeAsync(14400000)); expect(check).toHaveBeenCalledOnce();
    await render({ enabled: false }); await gesture(); expect(activity).not.toHaveBeenCalled();
  });
  it('clockOffset do servidor evita expiração prematura em relógio local adiantado', async () => {
    session = { ...session, clockOffsetMs: 600000 };
    await render(); await act(async () => vi.advanceTimersByTimeAsync(900000)); expect(check).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(600000)); expect(check).toHaveBeenCalledOnce();
  });
});
