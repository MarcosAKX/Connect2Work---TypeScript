import { useCallback, useEffect, useState } from 'react';
import { services } from '../services';
import type { BusinessService, UpdateBusinessServiceInput } from '../types/domain';

export function useAdminBusinessServices() {
  const [items, setItems] = useState<BusinessService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setIsLoading(true); setError('');
    try { setItems(await services.businessServices.listServices({ includeInactive: true })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os serviços.'); }
    finally { setIsLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  async function update(id: string, input: UpdateBusinessServiceInput) {
    setIsSaving(true); setError('');
    try { await services.businessServices.updateService(id, input); await reload(); return true; }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o serviço.'); return false; }
    finally { setIsSaving(false); }
  }
  return { items, isLoading, isSaving, error, setError, reload, update };
}
