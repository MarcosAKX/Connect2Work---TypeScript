import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import '../assets/css/pages/system-pages.css';

interface ErrorBoundaryState { failed: boolean }

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Ponto de integração futuro com Sentry; hoje mantém diagnóstico no navegador.
    console.error('Falha inesperada na interface.', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return <main className="system-page"><div><span>Algo saiu do esperado</span><h1>A tela encontrou um problema.</h1><p>Seus dados locais continuam preservados. Recarregue para tentar novamente.</p><button type="button" onClick={() => window.location.reload()}>Recarregar aplicação</button></div></main>;
  }
}
