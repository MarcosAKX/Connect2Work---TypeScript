import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, EyeIcon, GoogleIcon, MoonIcon, SunIcon } from '../components/icons';
import { NetworkBackground } from '../components/NetworkBackground';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';

export function LoginPage() {
  const { user, login, loginWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'secretaria' ? '/admin/painel-do-dia' : '/unidades'} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Informe seu e-mail e senha.');
      return;
    }

    setIsLoading(true);
    try {
      const authenticatedUser = await login(email, password);
      navigate(authenticatedUser.role === 'admin' ? '/admin' : authenticatedUser.role === 'secretaria' ? '/admin/painel-do-dia' : '/unidades', { replace: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível entrar.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setIsLoading(true);
    setError('');
    try {
      const authenticatedUser = await loginWithGoogle();
      navigate(authenticatedUser.role === 'admin' ? '/admin' : authenticatedUser.role === 'secretaria' ? '/admin/painel-do-dia' : '/unidades', { replace: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível entrar com Google.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page">
      <button type="button" className="login-theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}>
        {theme === 'dark' ? <MoonIcon width="19" height="19" /> : <SunIcon width="19" height="19" />}
      </button>
      <NetworkBackground />
      <div className="login-glow login-glow--top" aria-hidden="true" />
      <div className="login-glow login-glow--bottom" aria-hidden="true" />

      <div className="login-brand">
        <div className="login-logo"><span className="mark">Connect2<span>Work</span></span></div>
        <p className="login-tagline">Seu espaço de trabalho, do seu jeito.</p>
      </div>

      <section className="login-card card" aria-labelledby="login-heading">
        <div className="login-card-header">
          <h1 id="login-heading">Entrar</h1>
          <p>Acesse sua conta para agendar salas</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">E-mail ou usuário</label>
            <div className="field-input-wrap">
              <input id="email" name="email" type="text" placeholder="seu@email.com" autoComplete="username" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Senha</label>
            <div className="field-input-wrap">
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Sua senha" autoComplete="current-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button type="button" className="toggle-visibility" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                <EyeIcon width="18" height="18" hidden={showPassword} />
              </button>
            </div>
          </div>

          <div className="field-meta-row"><Link to="/recuperar-senha" className="text-link forgot-link">Esqueci minha senha</Link></div>
          {error && <p className="auth-form-error" role="alert">{error}</p>}

          <button type="submit" className={`btn btn-primary${isLoading ? ' is-loading' : ''}`} disabled={isLoading}>
            <span className="btn-label">Entrar</span><span className="btn-spinner" aria-hidden="true" />
          </button>
          <div className="divider">OU CONTINUE COM</div>
          <button type="button" className="btn btn-secondary" disabled={isLoading} onClick={handleGoogleLogin}><GoogleIcon width="18" height="18" />Entrar com Google</button>
        </form>

        <p className="login-footer">Não tem uma conta? <Link to="/cadastro" className="text-link">Cadastre-se</Link></p>
        <button type="button" className="back-link login-back-link" onClick={() => navigate(-1)}><ArrowLeftIcon width="14" height="14" />Voltar</button>
      </section>
    </main>
  );
}
