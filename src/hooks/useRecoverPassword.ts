import { useState, type FormEvent } from 'react';
import { services } from '../services';
import { emailError } from '../utils/validators';

export function useRecoverPassword() {
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

  return { email, setEmail, error, sent, isLoading, handleSubmit };
}
