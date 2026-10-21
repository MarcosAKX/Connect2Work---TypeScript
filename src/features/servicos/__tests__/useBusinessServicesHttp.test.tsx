import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAdminBusinessServices } from '../useAdminBusinessServices';
import { useBusinessServiceForm } from '../useBusinessServiceForm';
import type { BusinessService } from '../../../types/domain';

const mocks = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn(), save: vi.fn(), upload: vi.fn() }));
vi.mock('../../../services', () => ({ services: { businessServices: { listServices: mocks.list, updateService: mocks.update }, images: { upload: mocks.upload } } }));
const item: BusinessService = { id: 's', kind: 'fiscal_address', name: 'Fiscal', description: 'Descrição', primaryFeatures: [], secondaryFeatures: [], active: true, sortOrder: 0, imageUrl: null, imageId: 'legacy:12345678-1234-4234-8234-123456789012', version: 'versao-capturada' };
let root: Root;
let container: HTMLDivElement;
let model: ReturnType<typeof useAdminBusinessServices>;
function Probe() { model = useAdminBusinessServices(); return null; }
function FormProbe() { const form = useBusinessServiceForm(item, () => {}, mocks.save); return <form onSubmit={event => void form.submit(event)} />; }
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); container = document.createElement('div'); root = createRoot(container); mocks.list.mockReset().mockResolvedValue([item]); mocks.update.mockReset().mockResolvedValue(item); mocks.save.mockReset().mockResolvedValue(false); mocks.upload.mockReset(); });
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); });
it('edição envia versão capturada e preserva erro se recarregamento pós-gravação falhar', async () => {
  await act(async () => root.render(<Probe />));
  await act(async () => model.openEditor(item));
  mocks.list.mockRejectedValueOnce(new Error('Falha ao atualizar lista'));
  await act(async () => { expect(await model.save(item)).toBe(true); });
  await act(async () => model.closeEditor());
  expect(mocks.update).toHaveBeenCalledWith('s', item, 'versao-capturada');
  expect(model.data.error).toBe('Falha ao atualizar lista');
});
it('formulário mantém referência de imagem sem prévia e requestId na retentativa', async () => {
  await act(async () => root.render(<FormProbe />));
  const submit = async () => { await act(async () => container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); };
  await submit(); await submit();
  expect(mocks.save.mock.calls[0]?.[0].imageId).toBe(item.imageId);
  expect(mocks.save.mock.calls[1]?.[0].requestId).toBe(mocks.save.mock.calls[0]?.[0].requestId);
  expect(mocks.upload).not.toHaveBeenCalled();
});
