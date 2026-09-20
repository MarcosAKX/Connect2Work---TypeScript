import { useEffect, useRef } from 'react';
import type { User } from '../../types/domain';
import { useHoursPlanForm, type PlanForm } from '../../hooks/useHoursPlanForm';

interface PlanDialogProps {
  user: User;
  saving: boolean;
  error: string;
  onClose(): void;
  onSave(value: PlanForm): Promise<void>;
}

export function PlanDialog({ user, saving, error, onClose, onSave }: PlanDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const { value, setValue, validation, setValidation, submit } = useHoursPlanForm(user, onSave);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="hours-plan-modal"
      aria-labelledby="hours-plan-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
    >
      <div>
        <header>
          <h2 id="hours-plan-modal-title">{user.hasHoursPlan ? 'Ajustar plano' : 'Ativar plano'}</h2>
          <p>{user.name} · {user.email}</p>
        </header>
        <div className="hours-plan-form">
          <label className="hours-plan-toggle">
            <input
              type="checkbox"
              checked={value.enabled}
              onChange={(event) => setValue((current) => ({ ...current, enabled: event.target.checked }))}
            />
            <span>{value.enabled ? 'Com plano de horas' : 'Sem plano de horas'}</span>
          </label>
          {value.enabled && (
            <>
              <div className="hours-plan-form__grid">
                <label>
                  Total do pacote
                  <input
                    type="number" min="0.5" step="0.5" value={value.total}
                    onChange={(event) => {
                      setValidation('');
                      setValue((current) => ({ ...current, total: event.target.value }));
                    }}
                  />
                </label>
                <label>
                  Saldo atual
                  <input
                    type="number" min="0" step="0.5" value={value.balance}
                    onChange={(event) => {
                      setValidation('');
                      setValue((current) => ({ ...current, balance: event.target.value }));
                    }}
                  />
                </label>
              </div>
              <label>
                Próxima renovação
                <input
                  type="date" value={value.renewal}
                  onChange={(event) => {
                    setValidation('');
                    setValue((current) => ({ ...current, renewal: event.target.value }));
                  }}
                />
              </label>
              {Number(value.balance) > Number(value.total) && (
                <p className="hours-plan-warning">O saldo está acima do total contratado. Você ainda pode salvar.</p>
              )}
            </>
          )}
          {(validation || error) && <p className="hours-plan-error" role="alert">{validation || error}</p>}
        </div>
        <footer>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
