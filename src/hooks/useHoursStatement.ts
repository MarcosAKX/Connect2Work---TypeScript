import { useEffect, useState } from 'react';
import { services } from '../services';
import type { HoursPlanTransaction } from '../types/domain';

export function useHoursStatement(userId: string, actorId: string) {
  const [items, setItems] = useState<HoursPlanTransaction[]>([]);
  useEffect(() => {
    if (!userId || !actorId) {
      setItems([]);
      return;
    }
    void services.audit.listHoursPlanTransactions(userId, actorId).then(setItems);
  }, [actorId, userId]);
  return items;
}
