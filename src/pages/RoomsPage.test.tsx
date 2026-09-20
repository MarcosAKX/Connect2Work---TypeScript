import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { services } from '../services';
import type { Room, Unit } from '../types/domain';
import { RoomsPage } from './RoomsPage';

const unit: Unit = {
  id: 'unit-1', name: 'Unidade Teste', address: 'Rua Teste, 123',
  availableRooms: 99, imageUrl: null,
};
const rooms: Room[] = [
  { id: 'room-1', unitId: unit.id, name: 'Sala A', capacity: 4, pricePerHour: 45,
    amenities: ['Wi-Fi'], imageUrl: null, imageUrls: ['/a.jpg', '/b.jpg'] },
  { id: 'room-2', unitId: unit.id, name: 'Sala B', capacity: 8, pricePerHour: 80,
    amenities: [], imageUrl: null, imageUrls: ['/c.jpg', '/d.jpg'] },
  { id: 'room-3', unitId: unit.id, name: 'Sala C', capacity: 1, pricePerHour: 25,
    amenities: [], imageUrl: null },
];

describe('RoomsPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(services.catalog, 'getUnitById').mockResolvedValue(unit);
    vi.spyOn(services.catalog, 'getRoomsByUnitId').mockResolvedValue(rooms);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  async function mount(url = '/salas?unidade=unit-1') {
    await act(async () => root.render(
      <MemoryRouter initialEntries={[url]}><Routes>
        <Route path="/salas" element={<RoomsPage />} />
        <Route path="/unidades" element={<p>Escolher unidade</p>} />
      </Routes></MemoryRouter>,
    ));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  it.each(['ausente', 'inexistente'])('redireciona unidade %s', async (kind) => {
    if (kind === 'inexistente') vi.mocked(services.catalog.getUnitById).mockResolvedValue(null);
    await mount(kind === 'ausente' ? '/salas' : undefined);
    expect(container.textContent).toBe('Escolher unidade');
  });
  it('usa contagem real, mantém colunas, preços e links de reserva', async () => {
    await mount();
    expect(services.catalog.getRoomsByUnitId).toHaveBeenCalledWith(unit.id);
    expect(element('.unit-summary__badge').textContent).toBe('3 salas');
    expect(container.textContent).toContain(unit.address);
    expect(element('.rooms-column--primary').textContent).toContain('Sala C');
    expect(element('.rooms-column--secondary').textContent).toContain('Sala B');
    expect(element('.room-card--featured .room-card__title').textContent).toBe('Sala A');
    expect(element('.room-card__hourly-price').textContent?.replace(/\s/g, ' ')).toBe('R$ 45,00/hora');
    expect(element('a[aria-label="Ver horários de Sala A"]').getAttribute('href')).toBe('/agendamento?sala=room-1');
  });
  it('mantém carrosséis independentes e placeholder sem fotos', async () => {
    await mount();
    expect(container.textContent).toContain('Fotos em breve');
    await act(async () => element<HTMLButtonElement>('button[aria-label="Próxima imagem de Sala A"]').click());
    expect(element('img[alt="Sala A, imagem 2 de 2"]').getAttribute('src')).toBe('/b.jpg');
    expect(element('img[alt="Sala B, imagem 1 de 2"]').getAttribute('src')).toBe('/c.jpg');
    await act(async () => element<HTMLButtonElement>('button[aria-label="Próxima imagem de Sala A"]').click());
    expect(element('img[alt="Sala A, imagem 1 de 2"]').getAttribute('src')).toBe('/a.jpg');
  });
  it('mostra estado vazio', async () => {
    vi.mocked(services.catalog.getRoomsByUnitId).mockResolvedValue([]);
    await mount();
    expect(container.textContent).toContain('Nenhuma sala disponível');
    expect(element('.unit-summary__badge').textContent).toBe('0 salas');
  });
  it('mostra singular para uma sala', async () => {
    vi.mocked(services.catalog.getRoomsByUnitId).mockResolvedValue(rooms.slice(0, 1));
    await mount();
    expect(element('.unit-summary__badge').textContent).toBe('1 sala');
  });
});
