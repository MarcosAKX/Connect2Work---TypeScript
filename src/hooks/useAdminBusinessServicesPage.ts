import { useState } from 'react';
import { useAdminBusinessServices } from './useAdminBusinessServices';
import type { BusinessService, UpdateBusinessServiceInput } from '../types/domain';

export function useAdminBusinessServicesPage() {
  const data = useAdminBusinessServices();
  const [editing, setEditing] = useState<BusinessService | null>(null);
  const [status, setStatus] = useState('');

  async function save(input: UpdateBusinessServiceInput) {
    if (!editing) return false;
    const ok = await data.update(editing.id, input);
    if (ok) setStatus('Serviço atualizado com sucesso.');
    return ok;
  }
  function openEditor(item: BusinessService) {
    data.setError('');
    setEditing(item);
  }
  function closeEditor() {
    setEditing(null);
    data.setError('');
  }
  return { data, editing, status, save, openEditor, closeEditor };
}
