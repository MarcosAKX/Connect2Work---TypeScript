import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { services } from '../services';
import type { AuthSession } from '../services/contracts';
import type { User } from '../types/domain';
import { useSessionActivity } from './useSessionActivity';
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'error';
interface AuthState { status: AuthStatus; session: AuthSession | null; error: string; }
interface AuthContextValue {
  user: User | null; isAdmin: boolean; mode: 'mock' | 'http'; status: AuthStatus; error: string;
  login(email: string, password: string): Promise<User>; loginWithGoogle(): Promise<User>;
  refreshUser(): Promise<void>; logout(): Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
const anonymous: AuthState = { status: 'anonymous', session: null, error: '' };
export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: 'checking', session: null, error: '' });
  const [ending, setEnding] = useState(false);
  const [backgroundChecking, setBackgroundChecking] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const confirmedDeadline = useRef<number | null>(null);
  const alive = useRef(true); const generation = useRef(0); const leaving = useRef(false);
  const apply = useCallback((session: AuthSession | null) => {
    const expiresAt = session && services.auth.mode === 'http'
      ? Math.min(Date.parse(session.idleExpiresAt), Date.parse(session.absoluteExpiresAt)) + (session.clockOffsetMs ?? 0) : null;
    if (expiresAt !== null && Date.now() >= expiresAt) session = null;
    confirmedDeadline.current = session ? expiresAt : null;
    setDeadline(confirmedDeadline.current);
    if (!session) services.checkout.clearDraft();
    setState(session ? { status: 'authenticated', session, error: '' } : anonymous);
  }, []);
  const expire = useCallback(() => {
    generation.current++; confirmedDeadline.current = null; services.checkout.clearDraft();
    if (alive.current) { setDeadline(null); setBackgroundChecking(false); setState(anonymous); }
  }, []);
  useEffect(() => {
    if (deadline === null) return;
    // O prazo confirmado continua valendo mesmo com rede indisponível ou requisição pendente.
    const timer = setTimeout(() => {
      if (confirmedDeadline.current !== null && Date.now() >= confirmedDeadline.current) expire();
    }, Math.max(0, deadline - Date.now()));
    return () => clearTimeout(timer);
  }, [deadline, expire]);
  const refreshUser = useCallback(async () => {
    if (leaving.current) return;
    const operation = ++generation.current;
    setState({ status: 'checking', session: null, error: '' });
    try {
      const session = await services.auth.restoreSession();
      if (alive.current && operation === generation.current) apply(session);
    } catch {
      if (alive.current && operation === generation.current) setState({ status: 'error', session: null, error: 'Não foi possível verificar a sessão. Tente novamente.' });
    }
  }, [apply]);
  useEffect(() => {
    alive.current = true;
    const unsubscribe = services.auth.onSessionExpired(expire);
    void refreshUser();
    return () => { alive.current = false; generation.current++; unsubscribe(); };
  }, [refreshUser, expire]);
  const recordActivity = useCallback(async () => {
    if (leaving.current) return;
    const operation = ++generation.current;
    try {
      const session = await services.auth.recordActivity();
      if (alive.current && operation === generation.current) apply(session);
    } catch {
      if (alive.current && operation === generation.current) setState({ status: 'error', session: null, error: 'Não foi possível verificar a sessão. Tente novamente.' });
    }
  }, [apply]);
  const checkSession = useCallback(async () => {
    if (leaving.current) return;
    const expiresAt = confirmedDeadline.current;
    if (expiresAt === null) return;
    if (Date.now() >= expiresAt) { expire(); return; }
    const operation = ++generation.current;
    setBackgroundChecking(true);
    try {
      const session = await services.auth.restoreSession();
      if (alive.current && operation === generation.current) apply(session);
    } catch {
      if (alive.current && operation === generation.current) setState({ status: 'error', session: null, error: 'Não foi possível verificar a sessão. Tente novamente.' });
    } finally { if (alive.current) setBackgroundChecking(false); }
  }, [expire, apply]);
  useSessionActivity({ enabled: services.auth.mode === 'http' && state.status === 'authenticated' && !ending, session: state.session,
    onActivity: recordActivity, onCheck: checkSession });
  const authenticate = useCallback(async (operation: () => Promise<User>): Promise<User> => {
    if (leaving.current) throw new Error('Aguarde o encerramento da sessão.');
    const current = ++generation.current;
    setState({ status: 'checking', session: null, error: '' });
    let accepted = false;
    try {
      await operation(); accepted = true;
      const session = await services.auth.restoreSession();
      if (!alive.current || current !== generation.current) throw new Error('Operação de acesso cancelada. Tente novamente.');
      if (!session) { apply(null); throw new Error('Sessão encerrada. Faça login novamente.'); }
      apply(session);
      return session.user;
    } catch (error: unknown) {
      if (alive.current && current === generation.current) setState(accepted
        ? { status: 'error', session: null, error: 'Não foi possível verificar a sessão. Tente novamente.' } : anonymous);
      throw error;
    }
  }, [apply]);
  const login = useCallback((email: string, password: string) => authenticate(() => services.auth.login(email, password)), [authenticate]);
  const loginWithGoogle = useCallback(() => authenticate(() => services.auth.loginWithGoogle()), [authenticate]);
  const logout = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true; generation.current++; setEnding(true);
    try { await services.auth.logout(); expire(); }
    catch { throw new Error('Não foi possível encerrar a sessão. Tente novamente.'); }
    finally { leaving.current = false; if (alive.current) setEnding(false); }
  }, [expire]);
  const user = state.session?.user ?? null;
  const value = useMemo<AuthContextValue>(() => ({
    user, isAdmin: user?.role === 'admin', mode: services.auth.mode, status: state.status, error: state.error,
    login, loginWithGoogle, refreshUser, logout
  }), [user, state.status, state.error, login, loginWithGoogle, refreshUser, logout]);
  return <AuthContext.Provider value={value}><div style={{ display: 'contents' }} inert={backgroundChecking} aria-busy={backgroundChecking}>{children}</div></AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return value;
}
