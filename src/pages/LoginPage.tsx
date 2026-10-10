import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { EyeIcon, GoogleIcon, LockIcon } from '../components/icons';
import { PublicAuthLayout } from '../components/PublicAuthLayout';
import { useLogin } from '../hooks/useLogin';

export function LoginPage() {
  const {
    destination, email, password, error, isLoading,
    setEmail, setPassword, handleSubmit, handleGoogleLogin,
  } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  if (destination) return <Navigate to={destination} replace />;

  return (
    <PublicAuthLayout labelledBy="login-heading">
      <div className="login-card">
        <div className="login-card-header">
          <h1 id="login-heading">Bem-vindo</h1>
          <p>Acesse sua conta Connect2Work</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <div className="field-input-wrap">
              <input
                id="email" name="email" type="email" placeholder="usuario@empresa.com.br"
                autoComplete="username" maxLength={254} value={email}
                onChange={(event) => setEmail(event.target.value)} required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Senha</label>
            <div className="field-input-wrap">
              <input
                id="password" name="password" type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha" autoComplete="current-password" maxLength={128}
                value={password} onChange={(event) => setPassword(event.target.value)} required
              />
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
    </PublicAuthLayout>
  );
}
