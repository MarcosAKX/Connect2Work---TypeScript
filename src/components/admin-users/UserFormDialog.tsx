import { useEffect, useRef } from 'react';
import type { User } from '../../types/domain';
import { useManagedUserForm, type UserFormValue } from '../../hooks/useManagedUserForm';

interface UserFormDialogProps {
  user: User | null;
  currentUserId?: string;
  saving: boolean;
  gatewayError: string;
  onClose(): void;
  onSubmit(value: UserFormValue): Promise<void>;
}

export function UserFormDialog({
  user, currentUserId, saving, gatewayError, onClose, onSubmit,
}: UserFormDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const { isEditing, isSelf, value, validationError, change, submit } =
    useManagedUserForm(user, currentUserId, onSubmit);

  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="admin-users-modal admin-users-modal--form"
      aria-labelledby="user-form-title"
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}
    >
      <div>
        <header>
          <div>
            <h2 id="user-form-title">{isEditing ? 'Editar usuário' : 'Cadastrar usuário'}</h2>
            <p>{isEditing ? 'Atualize os dados pessoais e de acesso.' : 'Crie uma nova conta e defina seu nível de acesso.'}</p>
          </div>
        </header>
        <div className="admin-users-form">
          <label>
            Nome completo
            <input
              value={value.name}
              onChange={(event) => change('name', event.target.value)}
              maxLength={100}
              autoComplete="name"
              autoFocus
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              value={value.email}
              onChange={(event) => change('email', event.target.value)}
              maxLength={254}
              autoComplete="email"
            />
          </label>
          <div className="admin-users-form__grid">
            <label>
              Profissão <span>(opcional)</span>
              <input
                value={value.profession}
                onChange={(event) => change('profession', event.target.value)}
                maxLength={80}
              />
            </label>
            <label>
              Telefone <span>(opcional)</span>
              <input
                value={value.phone}
                onChange={(event) => change('phone', event.target.value)}
                maxLength={30}
                autoComplete="tel"
              />
            </label>
          </div>
          <label>
            {isEditing ? 'Nova senha' : 'Senha'} <span>{isEditing ? '(deixe vazio para manter a atual)' : '(mínimo de 6 caracteres)'}</span>
            <input
              type="password"
              value={value.password}
              onChange={(event) => change('password', event.target.value)}
              minLength={6}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <div className="admin-users-form__grid">
            <label>
              Permissão
              <select
                value={value.role}
                onChange={(event) => change(
                  'role',
                  event.target.value === 'admin' || event.target.value === 'secretaria'
                    ? event.target.value : 'client',
                )}
                disabled={isSelf}
              >
                <option value="client">Cliente</option>
                <option value="secretaria">Secretaria</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={value.active ? 'active' : 'inactive'}
                onChange={(event) => change('active', event.target.value === 'active')}
                disabled={isSelf}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>
          </div>
          {isSelf && <p className="admin-users-form__hint">Sua própria permissão administrativa e seu acesso permanecem protegidos.</p>}
          {(validationError || gatewayError) && (
            <p className="admin-users-form__error" role="alert">{validationError || gatewayError}</p>
          )}
        </div>
        <footer>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar usuário'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
