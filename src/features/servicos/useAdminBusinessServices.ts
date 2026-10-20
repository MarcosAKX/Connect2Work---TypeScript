import { useCallback, useEffect, useState, useRef } from 'react';
import { services } from '../../services';
import type { BusinessService, BusinessServiceKind, UpdateBusinessServiceInput } from '../../types/domain';

export function useAdminBusinessServices() {
  const sequence = useRef(0);
  const saving = useRef(false);
  const [items, setItems] = useState<BusinessService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    const request = ++sequence.current;
    setIsLoading(true); setError('');
    try { const items = await services.businessServices.listServices({ includeInactive: true }); if (request === sequence.current) setItems(items); }
    catch (caught) { if (request === sequence.current) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os serviços.'); }
    finally { if (request === sequence.current) setIsLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  async function update(id: string, input: UpdateBusinessServiceInput, version?: string) {
    if (saving.current) return false;
    saving.current = true; setIsSaving(true); setError('');
    try { if (id) await services.businessServices.updateService(id, input, version); else await services.businessServices.createService(input); await reload(); return true; }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o serviço.'); return false; }
    finally { saving.current = false; setIsSaving(false); }
  }
  const data = { items, isLoading, isSaving, error, setError, reload, update };

  const [editing, setEditing] = useState<BusinessService | null>(null);
  const [status, setStatus] = useState('');

  async function save(input: UpdateBusinessServiceInput) {
    if (!editing) return false;
    const ok = await data.update(editing.id, input, editing.version);
    if (ok) setStatus(editing.id ? 'Serviço atualizado com sucesso.' : 'Serviço cadastrado com sucesso.');
    return ok;
  }
  function openEditor(item: BusinessService) {
    data.setError('');
    setEditing(item);
  }
  function closeEditor() {
    setEditing(null);
  }
  const kinds: Array<{ kind: BusinessServiceKind; name: string }> = [
    { kind: 'fiscal_address', name: 'Endereço Fiscal' }, { kind: 'commercial_address', name: 'Endereço Comercial' }, { kind: 'hours_plan', name: 'Plano de Horas' },
  ];
  const missing = kinds.filter(option => !items.some(item => item.kind === option.kind));
  function create(option: { kind: BusinessServiceKind; name: string }) {
    setError(''); setEditing({ id: '', ...option, description: '', primaryFeatures: [], secondaryFeatures: [], imageUrl: null, active: true, sortOrder: kinds.findIndex(item => item.kind === option.kind) });
  }
  return { data, editing, status, save, openEditor, closeEditor, missing, create };
}
