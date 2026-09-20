import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { services } from '../services';
import type { Unit } from '../types/domain';
import { UnitsPage } from './UnitsPage';

vi.mock('../components/UnitsMap', () => ({
  UnitsMap: ({ selectedUnitId, onSelect }: { selectedUnitId: string | null; onSelect(id: string): void }) => (
    <button data-testid="map" onClick={() => onSelect('b')}>{selectedUnitId}</button>
  ),
}));

const units: Unit[] = [
  { id: 'a', name: 'Unidade A', address: 'Rua A', availableRooms: 5, imageUrl: '/a.jpg', latitude: -20, longitude: -48 },
  { id: 'b', name: 'Unidade B', address: 'Rua B', availableRooms: 2, imageUrl: null, latitude: -21, longitude: -48 },
  { id: 'c', name: 'Unidade C', address: 'Rua C', availableRooms: 0, imageUrl: null },
];

describe('UnitsPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  let success: PositionCallback;
  let failure: PositionErrorCallback | null | undefined;
  const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>();
  const originalLocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(services.catalog, 'getUnits').mockResolvedValue(units);
    getCurrentPosition.mockReset().mockImplementation((ok, fail) => { success = ok; failure = fail; });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    if (originalLocation) Object.defineProperty(navigator, 'geolocation', originalLocation);
    else Reflect.deleteProperty(navigator, 'geolocation');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  async function mount() {
    await act(async () => root.render(<MemoryRouter><UnitsPage /></MemoryRouter>));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  async function click(selector: string) {
    await act(async () => element<HTMLButtonElement>(selector).click());
  }
  it('preserva catálogo, seleção pelo mapa/cartão e links', async () => {
    await mount();
    expect(container.querySelectorAll('article')).toHaveLength(3);
    expect(element('.is-selected h2').textContent).toBe('Unidade A');
    expect(element('img').getAttribute('src')).toBe('/a.jpg');
    expect(element('a.btn').getAttribute('href')).toBe('/salas?unidade=a');
    expect(getCurrentPosition).not.toHaveBeenCalled();
    await click('[data-testid="map"]');
    expect(element('.is-selected h2').textContent).toBe('Unidade B');
    await click('[aria-label="Mostrar Unidade C no mapa"]');
    expect(element('[data-testid="map"]').textContent).toBe('c');
  });
  it('solicita localização apenas por ação e ordena unidades com coordenadas', async () => {
    await mount();
    await click('.units-nearest__permission button');
    expect(element<HTMLButtonElement>('.units-nearest__permission button').disabled).toBe(true);
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: false, timeout: 10000, maximumAge: 300000,
    });
    await act(async () => success({ coords: {
      latitude: -21, longitude: -48, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null,
      toJSON: () => ({}),
    }, timestamp: 1, toJSON: () => ({}) }));
    const names = [...container.querySelectorAll('.units-nearest__list strong')].map((node) => node.textContent);
    expect(names).toEqual(['Unidade B', 'Unidade A']);
    expect(element('.unit-location-card__badge').closest('article')?.textContent).toContain('Unidade B');
    expect(element('.units-nearest__list b').textContent).toBe('0,0 km');
    await click('.units-nearest__list button');
    expect(element('.is-selected h2').textContent).toBe('Unidade B');
  });
  it.each([1, 2])('preserva erro de localização %s e permite nova tentativa', async (code) => {
    await mount();
    await click('.units-nearest__permission button');
    await act(async () => failure?.({ code, message: 'Erro', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }));
    expect(container.textContent).toContain(code === 1 ? 'Localização bloqueada' : 'Não foi possível obter sua localização');
    expect(element<HTMLButtonElement>('.units-nearest__permission button').disabled).toBe(false);
  });
  it('preserva catálogo vazio e navegador sem geolocalização', async () => {
    vi.mocked(services.catalog.getUnits).mockResolvedValue([]);
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    await mount();
    expect(container.querySelectorAll('article')).toHaveLength(0);
    await click('.units-nearest__permission button');
    expect(container.textContent).toContain('Não foi possível obter sua localização');
  });
});
