import { useEffect, useRef } from 'react';
import type { AuthSession } from '../services/contracts';
const trustedEvent = (event: Event) => event.isTrusted;
interface Options {
  enabled: boolean; session: AuthSession | null; onActivity(): Promise<void>; onCheck(): Promise<void>;
  acceptEvent?: (event: Event) => boolean;
}
export function useSessionActivity({ enabled, session, onActivity, onCheck, acceptEvent = trustedEvent }: Options): void {
  const lastSent = useRef(Number.NEGATIVE_INFINITY);
  const inFlight = useRef(false);
  useEffect(() => {
    if (!enabled || !session) return;
    const deadline = Math.min(Date.parse(session.idleExpiresAt), Date.parse(session.absoluteExpiresAt)) + (session.clockOffsetMs ?? 0);
    let pending = false; let stopped = false;
    let activityTimer: ReturnType<typeof setTimeout> | undefined;
    function run(action: () => Promise<void>): void {
      if (inFlight.current || stopped) return;
      inFlight.current = true;
      void action().catch(() => undefined).finally(() => { inFlight.current = false; });
    }
    function check(): void { run(onCheck); }
    function send(): void {
      activityTimer = undefined;
      if (!pending || stopped || document.visibilityState !== 'visible') { pending = false; return; }
      if (Date.now() >= deadline) { pending = false; check(); return; }
      pending = false;
      lastSent.current = Date.now();
      run(onActivity);
    }
    function handle(event: Event): void {
      if (!acceptEvent(event) || document.visibilityState !== 'visible') return;
      pending = true;
      if (activityTimer === undefined) {
        const wait = Math.max(0, 60000 - (Date.now() - lastSent.current));
        if (wait === 0) send(); else activityTimer = setTimeout(send, wait);
      }
    }
    function visible(): void { if (document.visibilityState === 'visible') check(); }
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'input'];
    for (const event of events) document.addEventListener(event, handle, { passive: true });
    document.addEventListener('visibilitychange', visible);
    // Sinaliza o limite ao coordenador; não envia heartbeat nem renova a sessão sozinho.
    const expiryTimer = setTimeout(check, Math.max(0, deadline - Date.now()));
    return () => {
      stopped = true;
      if (activityTimer !== undefined) clearTimeout(activityTimer);
      clearTimeout(expiryTimer);
      for (const event of events) document.removeEventListener(event, handle);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [enabled, session?.idleExpiresAt, session?.absoluteExpiresAt, session?.clockOffsetMs, onActivity, onCheck, acceptEvent]);
}
