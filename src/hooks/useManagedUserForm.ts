import { useState } from 'react';
import type { User, UserRole } from '../types/domain';

export interface UserFormValue {
  name: string;
  email: string;
  profession: string;
  phone: string;
  password: string;
  role: UserRole;
  active: boolean;
}


export function useManagedUserForm(
  user: User | null,
  currentUserId: string | undefined,
  onSubmit: (value: UserFormValue) => Promise<void>,
) {
  const isEditing = Boolean(user);
  const isSelf = user?.id === currentUserId;
  const [value, setValue] = useState<UserFormValue>(() => ({
    name: user?.name ?? '', email: user?.email ?? '', profession: user?.profession ?? '',
    phone: user?.phone ?? '', password: '', role: user?.role ?? 'client', active: user?.active ?? true,
  }));
  const [validationError, setValidationError] = useState('');


  function change<K extends keyof UserFormValue>(key: K, next: UserFormValue[K]) {
    setValue((current) => ({ ...current, [key]: next }));
    setValidationError('');
  }

  function submit() {
    if (value.name.trim().length < 2) {
      setValidationError('Informe um nome válido.');
      return;
    }
    if (!value.email.includes('@')) {
      setValidationError('Informe um e-mail válido.');
      return;
    }
    if (!isEditing && value.password.length < 6) {
      setValidationError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (isEditing && value.password && value.password.length < 6) {
      setValidationError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    void onSubmit(value);
  }


  return { isEditing, isSelf, value, validationError, change, submit };
}
