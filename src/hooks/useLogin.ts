import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export function useLogin() {
  const { user, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);


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

  const destination = user
    ? user.role === 'admin' ? '/admin' : user.role === 'secretaria' ? '/admin/painel-do-dia' : '/unidades'
    : null;
  return { destination, email, password, error, isLoading, setEmail, setPassword, handleSubmit, handleGoogleLogin };
}
