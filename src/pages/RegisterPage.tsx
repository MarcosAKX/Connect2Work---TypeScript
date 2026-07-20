import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, EyeIcon } from '../components/icons';
import { NetworkBackground } from '../components/NetworkBackground';
import { services } from '../services';
import { emailError, formatPhone, fullNameError, passwordError, phoneError, professionError } from '../utils/validators';

interface RegisterForm {
  name: string;
  email: string;
  profession: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface FormFieldProps {
  label: string;
  name: keyof RegisterForm;
  value: string;
  onChange(field: keyof RegisterForm, value: string): void;
  type?: string;
  autoComplete: string;
  placeholder: string;
  maxLength?: number;
  inputMode?: 'numeric';
  toggle?: { shown: boolean; change(value: boolean): void; label: string };
}

const initialForm: RegisterForm = { name: '', email: '', profession: '', phone: '', password: '', confirmPassword: '' };

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  function updateField(field: keyof RegisterForm, value: string) {
    setForm((current) => ({ ...current, [field]: field === 'phone' ? formatPhone(value) : value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = fullNameError(form.name) ?? emailError(form.email) ?? professionError(form.profession) ?? phoneError(form.phone) ?? passwordError(form.password) ?? (form.password !== form.confirmPassword ? 'As senhas não coincidem.' : null);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await services.auth.register({ name: form.name, email: form.email, profession: form.profession, phone: form.phone, password: form.password });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível criar sua conta.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page cadastro-page">
      <NetworkBackground />
      <div className="login-glow login-glow--top" aria-hidden="true" />
      <div className="login-glow login-glow--bottom" aria-hidden="true" />
      <div className="login-brand"><div className="login-logo"><span className="mark">Connect2<span>Work</span></span></div><p className="login-tagline">Crie sua conta e reserve seu espaço</p></div>

      <section className="login-card card cadastro-card" aria-labelledby="register-heading">
        <div className="login-card-header"><h1 id="register-heading">Criar Conta</h1><p>Preencha os dados abaixo para se cadastrar</p></div>
        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Nome Completo" name="name" value={form.name} onChange={updateField} autoComplete="name" placeholder="Seu nome completo" maxLength={100} />
          <FormField label="E-mail" name="email" value={form.email} onChange={updateField} type="email" autoComplete="email" placeholder="seu@email.com" maxLength={254} />
          <FormField label="Profissão" name="profession" value={form.profession} onChange={updateField} autoComplete="organization-title" placeholder="Ex: Desenvolvedor, Designer, Advogado" maxLength={80} />
          <FormField label="Telefone" name="phone" value={form.phone} onChange={updateField} type="tel" autoComplete="tel" placeholder="(00) 00000-0000" inputMode="numeric" />
          <FormField label="Senha" name="password" value={form.password} onChange={updateField} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 6 caracteres" maxLength={128} toggle={{ shown: showPassword, change: setShowPassword, label: 'senha' }} />
          <FormField label="Confirmar Senha" name="confirmPassword" value={form.confirmPassword} onChange={updateField} type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" placeholder="Confirme sua senha" maxLength={128} toggle={{ shown: showConfirmation, change: setShowConfirmation, label: 'confirmação de senha' }} />
          {error && <p className="auth-form-error" role="alert">{error}</p>}
          <button className={`btn btn-primary${isLoading ? ' is-loading' : ''}`} type="submit" disabled={isLoading}><span className="btn-label">Criar Conta</span><span className="btn-spinner" aria-hidden="true" /></button>
        </form>
        <p className="login-footer">Já tem uma conta? <Link to="/login" className="text-link">Entrar</Link></p>
        <Link to="/login" className="back-link"><ArrowLeftIcon width="14" height="14" />Voltar para login</Link>
      </section>
    </main>
  );
}

function FormField({ label, name, value, onChange, type = 'text', autoComplete, placeholder, maxLength, inputMode, toggle }: FormFieldProps) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="field-input-wrap">
        <input id={name} name={name} type={type} autoComplete={autoComplete} placeholder={placeholder} maxLength={maxLength} inputMode={inputMode} value={value} onChange={(event) => onChange(name, event.target.value)} required />
        {toggle && <button type="button" className="toggle-visibility" onClick={() => toggle.change(!toggle.shown)} aria-label={`${toggle.shown ? 'Ocultar' : 'Mostrar'} ${toggle.label}`}><EyeIcon width="18" height="18" hidden={toggle.shown} /></button>}
      </div>
    </div>
  );
}
