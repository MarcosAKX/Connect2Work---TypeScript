import { useEffect, useState } from 'react';
import { services } from '../services';
import type { BusinessService } from '../types/domain';

export function useServices() {
  const [items, setItems] = useState<BusinessService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void services.businessServices.listServices()
      .then((nextItems) => { if (active) setItems(nextItems); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const fiscal = items.find(({ kind }) => kind === 'fiscal_address');
  const commercial = items.find(({ kind }) => kind === 'commercial_address');
  const hours = items.find(({ kind }) => kind === 'hours_plan');

  return { fiscal, commercial, hours, isLoading };
}
