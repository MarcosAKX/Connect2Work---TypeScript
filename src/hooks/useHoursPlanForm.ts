import { useState } from 'react';
import type { User } from '../types/domain';

export type PlanForm = {
  enabled: boolean;
  total: string;
  balance: string;
  renewal: string;
};

export function useHoursPlanForm(user: User, onSave: (value: PlanForm) => Promise<void>) {
  const [value, setValue] = useState<PlanForm>({
    enabled: user.hasHoursPlan,
    total: String(user.hoursPlanTotal ?? ''),
    balance: String(user.hasHoursPlan ? user.hoursBalance : ''),
    renewal: user.hoursPlanRenewsOn ?? '',
  });
  const [validation, setValidation] = useState('');

  function submit() {
    const total = Number(value.total);
    const balance = Number(value.balance);
    if (value.enabled && (!Number.isFinite(total) || total <= 0)) {
      setValidation('Informe o total contratado.');
      return;
    }
    if (value.enabled && (!Number.isFinite(balance) || balance < 0)) {
      setValidation('O saldo não pode ser negativo.');
      return;
    }
    if (value.enabled && !value.renewal) {
      setValidation('Informe a data de renovação.');
      return;
    }
    void onSave(value);
  }

  return { value, setValue, validation, setValidation, submit };
}
