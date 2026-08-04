import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '../components/icons';
import { PublicAuthLayout } from '../components/PublicAuthLayout';
import { services } from '../services';
import { emailError } from '../utils/validators';

export function RecoverPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = emailError(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await services.auth.resetPassword(email.trim());
      setSent(true);
    } catch {
      setError('Não foi possível enviar o link. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <PublicAuthLayout labelledBy="recover-heading" pageClassName="recover-page">
      <div className="login-card recover-card">
        <div className="login-card-header">
          <h1 id="recover-heading">{sent ? 'Verifique seu e-mail' : 'Recuperar Senha'}</h1>
          {!sent && <p>Informe seu e-mail para receber o link de redefinição</p>}
        </div>
        {!sent ? (
          <form onSubmit={handleSubmit} noValidate>
            <div className="field"><label htmlFor="recover-email">E-mail</label><div className="field-input-wrap"><input id="recover-email" name="email" type="email" placeholder="seu@email.com" autoComplete="email" inputMode="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required /></div></div>
            {error && <p className="auth-form-error" role="alert">{error}</p>}
            <button className={`btn btn-primary${isLoading ? ' is-loading' : ''}`} type="submit" disabled={isLoading}><span className="btn-label">Enviar link</span><span className="btn-spinner" aria-hidden="true" /></button>
          </form>
        ) : (
          <div className="recover-success" role="status"><p className="recover-success-text">Enviamos um link de redefinição para <strong>{email.trim()}</strong>. Verifique sua caixa de entrada e o spam.</p><Link to="/login" className="btn btn-secondary recover-success-btn">Voltar para login</Link></div>
        )}
        {!sent && <Link to="/login" className="back-link"><ArrowLeftIcon width="14" height="14" />Voltar para login</Link>}
      </div>
    </PublicAuthLayout>
  );
}
