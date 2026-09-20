import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { services } from '../services';
import { emailError, formatPhone, fullNameError, passwordError, phoneError, professionError } from '../utils/validators';

export interface RegisterForm {
  name: string;
  email: string;
  profession: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const initialForm: RegisterForm = { name: '', email: '', profession: '', phone: '', password: '', confirmPassword: '' };

export function useRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function updateField(field: keyof RegisterForm, value: string) {
    setForm((current) => ({ ...current, [field]: field === 'phone' ? formatPhone(value) : value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = fullNameError(form.name)
      ?? emailError(form.email)
      ?? professionError(form.profession)
      ?? phoneError(form.phone)
      ?? passwordError(form.password)
      ?? (form.password !== form.confirmPassword ? 'As senhas não coincidem.' : null);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await services.auth.register({
        name: form.name,
        email: form.email,
        profession: form.profession,
        phone: form.phone,
        password: form.password,
      });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível criar sua conta.');
    } finally {
      setIsLoading(false);
    }
  }

  return { form, error, isLoading, updateField, handleSubmit };
}
