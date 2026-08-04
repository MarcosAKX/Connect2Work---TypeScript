import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { EyeIcon, GoogleIcon, LockIcon } from '../components/icons';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../state/AuthContext';

export function LoginPage() {
  const { user, login, loginWithGoogle } = useAuth();
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
    <main className="login-page login-page--split">
      <section className="login-visual" aria-label="Fachada da Connect2Work">
        <div className="login-visual__logo" aria-label="Connect2Work"><span>C2</span><b>W</b></div>
        <div className="login-visual__message">
          <strong>Seu espaço. Seu ritmo.</strong>
          <span>Salas e soluções para trabalhar melhor.</span>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-heading">
        <ThemeToggle className="login-theme-toggle" />
        <div className="login-card">
        <div className="login-card-header">
          <h1 id="login-heading">Bem-vindo de volta</h1>
          <p>Acesse sua conta Connect2Work</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <div className="field-input-wrap">
              <input id="email" name="email" type="email" placeholder="usuario@empresa.com.br" autoComplete="username" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required />
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
          <div className="divider">ou</div>
          <Link to="/cadastro" className="btn btn-secondary login-register-button">Criar uma conta</Link>
          <button type="button" className="login-google-button" disabled={isLoading} onClick={handleGoogleLogin}><GoogleIcon width="17" height="17" />Entrar com Google</button>
        </form>

          <p className="login-security"><LockIcon width="15" height="15" />Ambiente seguro <span aria-hidden="true">·</span> Seus dados protegidos</p>
        </div>
      </section>
    </main>
  );
}
