import { useEffect, useState } from 'react';
import { services } from '../../services';
import type { BusinessService } from '../../types/domain';

export function useServices() {
  const [items, setItems] = useState<BusinessService[]>([]);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true; setIsLoading(true); setError('');
    void services.businessServices.listServices()
      .then((nextItems) => { if (active) setItems(nextItems); })
      .catch(() => { if (active) setError('Não foi possível carregar os serviços. Tente novamente.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const fiscal = items.find(({ kind }) => kind === 'fiscal_address');
  const commercial = items.find(({ kind }) => kind === 'commercial_address');
  const hours = items.find(({ kind }) => kind === 'hours_plan');

  return { fiscal, commercial, hours, isLoading, error, retry: () => setAttempt(value => value + 1) };
}
