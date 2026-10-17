import { RouteLoading } from './RouteLoading';
import type { AuthStatus } from '../state/AuthContext';
export function AuthRouteStatus({ status, error, onRetry }: { status: AuthStatus; error: string; onRetry(): Promise<void> }) {
  if (status === 'checking') return <RouteLoading />;
  return <main className="route-loading auth-route-status">
    <p role="alert">{error || 'Não foi possível verificar a sessão.'}</p>
    <button type="button" className="btn btn-primary" onClick={() => { void onRetry(); }}>Tentar novamente</button>
  </main>;
}
