import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '../components/icons';
import { PublicAuthLayout } from '../components/PublicAuthLayout';
import { RegisterFormField } from '../components/auth/RegisterFormField';
import { useRegister } from '../hooks/useRegister';

export function RegisterPage() {
  const { form, error, isLoading, updateField, handleSubmit } = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  return (
    <PublicAuthLayout labelledBy="register-heading" pageClassName="cadastro-page">
      <div className="login-card cadastro-card">
        <div className="login-card-header"><h1 id="register-heading">Criar Conta</h1><p>Preencha os dados abaixo para se cadastrar</p></div>
        <form onSubmit={handleSubmit} noValidate>
          <RegisterFormField label="Nome Completo" name="name" value={form.name} onChange={updateField} autoComplete="name" placeholder="Seu nome completo" maxLength={100} />
          <RegisterFormField label="E-mail" name="email" value={form.email} onChange={updateField} type="email" autoComplete="email" placeholder="seu@email.com" maxLength={254} />
          <RegisterFormField label="Profissão" name="profession" value={form.profession} onChange={updateField} autoComplete="organization-title" placeholder="Ex: Desenvolvedor, Designer, Advogado" maxLength={80} />
          <RegisterFormField label="Telefone" name="phone" value={form.phone} onChange={updateField} type="tel" autoComplete="tel" placeholder="(00) 00000-0000" inputMode="numeric" />
          <RegisterFormField label="Senha" name="password" value={form.password} onChange={updateField} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 6 caracteres" maxLength={128} toggle={{ shown: showPassword, change: setShowPassword, label: 'senha' }} />
          <RegisterFormField label="Confirmar Senha" name="confirmPassword" value={form.confirmPassword} onChange={updateField} type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" placeholder="Confirme sua senha" maxLength={128} toggle={{ shown: showConfirmation, change: setShowConfirmation, label: 'confirmação de senha' }} />
          {error && <p className="auth-form-error" role="alert">{error}</p>}
          <button className={`btn btn-primary${isLoading ? ' is-loading' : ''}`} type="submit" disabled={isLoading}><span className="btn-label">Criar Conta</span><span className="btn-spinner" aria-hidden="true" /></button>
        </form>
        <p className="login-footer">Já tem uma conta? <Link to="/login" className="text-link">Entrar</Link></p>
        <Link to="/login" className="back-link"><ArrowLeftIcon width="14" height="14" />Voltar para login</Link>
      </div>
    </PublicAuthLayout>
  );
}
