import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import type { Unit } from '../types/domain';
import { useUnits } from './useUnits';
const mocks = vi.hoisted(() => ({ getUnits: vi.fn<() => Promise<Unit[]>>() }));
vi.mock('../services', () => ({ services: { catalog: { getUnits: mocks.getUnits } } }));
let model: ReturnType<typeof useUnits>;
function Probe() { model = useUnits(); return <output>{model.loading ? 'loading' : model.error || model.units.map(unit => unit.name).join(',')}</output>; }
describe('Unidades ViewModel', () => {
  let root: Root; let container: HTMLDivElement;
  beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); mocks.getUnits.mockReset(); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
  it('aguarda banco, aceita lista vazia e permite tentar novamente após falha', async () => {
    mocks.getUnits.mockRejectedValueOnce(new Error('SQL privado')).mockResolvedValueOnce([]);
    await act(async () => root.render(<Probe />));
    expect(model.error).toContain('Não foi possível carregar'); expect(container.textContent).not.toContain('SQL privado');
    await act(async () => model.reload());
    expect(model.units).toEqual([]); expect(model.error).toBe(''); expect(model.loading).toBe(false);
  });
  it('seleciona primeira unidade e não aceita uma resposta anterior à nova tentativa', async () => {
    let finish: ((items: Unit[]) => void) | undefined;
    mocks.getUnits.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce([{ id: 'real', name: 'Real', address: 'Rua', imageUrl: null, availableRooms: 0 }]);
    await act(async () => root.render(<Probe />)); expect(model.loading).toBe(true);
    await act(async () => model.reload()); expect(model.selectedUnitId).toBe('real');
    await act(async () => finish?.([])); expect(model.units[0]?.id).toBe('real');
  });
});
