import { useEffect, useRef, useState } from 'react';
import { useAdminUsers } from './useAdminUsers';
import type { UserFormValue } from './useManagedUserForm';
import type { User, CreateManagedUserInput, UpdateManagedUserInput } from '../types/domain';

// Coordenação da página; leitura e mutações permanecem em useAdminUsers.
export function useAdminUsersPage(currentUser: User | null, refreshUser: () => void) {
  const admin = useAdminUsers();
  const [formUser, setFormUser] = useState<User | null | undefined>(undefined);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const deactivateDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (deactivatingUser) deactivateDialogRef.current?.showModal();
    else deactivateDialogRef.current?.close();
  }, [deactivatingUser]);

  async function saveUser(value: UserFormValue) {
    if (formUser) {
      const input: UpdateManagedUserInput = { ...value, password: value.password || undefined };
      if (await admin.updateUser(formUser.id, input)) {
        if (formUser.id === currentUser?.id) refreshUser();
        setFormUser(undefined);
      }
      return;
    }
    const input: CreateManagedUserInput = value;
    if (await admin.createUser(input)) setFormUser(undefined);
  }

  async function confirmDeactivate() {
    if (deactivatingUser && await admin.updateStatus(deactivatingUser.id, false)) setDeactivatingUser(null);
  }


  return {
    admin, currentUserId: currentUser?.id, formUser, setFormUser,
    deactivatingUser, setDeactivatingUser, deactivateDialogRef,
    saveUser, confirmDeactivate,
  };
}
export type AdminUsersViewModel = ReturnType<typeof useAdminUsersPage>;
