import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import type { Room } from '../types/domain';
import * as imageUpload from '../utils/image-upload';
import { AdminRoomsPage } from './AdminRoomsPage';

describe('AdminRoomsPage — catálogo de salas', () => {
  let container: HTMLDivElement;
  let root: Root;
  let room: Room;
  const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 9, 12));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true, value(this: HTMLDialogElement) { this.open = true; },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true, value(this: HTMLDialogElement) { this.open = false; },
    });
    localStorage.clear();
    sessionStorage.clear();
    createLocalStorageServices();
    localStorage.setItem('c2w_mock_bookings', '[]');
    await services.auth.login('admin@connect2work.com', 'admin123');
    const loaded = await services.catalog.getRoomById('room-1-1');
    if (!loaded) throw new Error('Sala seed ausente');
    room = loaded;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function mount() {
    await act(async () => root.render(<MemoryRouter><AdminRoomsPage /></MemoryRouter>));
  }
  function element<T extends Element>(selector: string): T {
    const found = container.querySelector<T>(selector);
    if (!found) throw new Error(`Elemento ausente: ${selector}`);
    return found;
  }
  async function click(selector: string) {
    await act(async () => element<HTMLButtonElement>(selector).click());
  }
  async function change(selector: string, value: string) {
    const input = element<HTMLInputElement | HTMLSelectElement>(selector);
    const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
  }
  async function submit() {
    await act(async () => element('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  }
  async function enter(selector: string) {
    await act(async () => element(selector).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })));
  }
  async function upload(files: File[]) {
    const input = element<HTMLInputElement>('input[type="file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: files });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  }
  function previews() { return [...container.querySelectorAll<HTMLImageElement>('.admin-room-form__image-list img')].map((image) => image.getAttribute('src')); }
  async function edit() { await click(`[aria-label="Editar ${room.name}"]`); }

  it('filtra unidade sem alterar a contagem total de salas', async () => {
    await mount();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    await change('.admin-rooms-card > header select', 'unit-2');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(element('.admin-rooms-card > header p').textContent).toBe('Total de 10 salas');
    await change('.admin-rooms-card > header select', '');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
  });

  it('valida campos e cria sala com capacidade e preço corretos', async () => {
    await mount();
    await click('.admin-rooms-page__intro button');
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('nome e unidade');
    await change('#room-name', '  Sala Nova  ');
    await change('#room-capacity', '1.5');
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('capacidade inteira');
    await change('#room-capacity', '6');
    await change('#room-price', '0');
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('preço por hora');
    await change('#room-price', '65.50');
    await submit();
    expect((await services.catalog.getRoomsByUnitId('unit-1')).find((item) => item.name === 'Sala Nova')).toMatchObject({ capacity: 6, pricePerHour: 65.5, imageUrl: null, imageUrls: [] });
    expect(container.querySelector('.admin-room-form')).toBeNull();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(11);
    await act(async () => vi.advanceTimersByTime(5000));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('edita dados e galeria existentes sem perder campos da sala', async () => {
    await services.catalog.updateRoom(room.id, { ...room, imageUrl: '/first.jpg', imageUrls: ['/first.jpg', '/second.jpg'] });
    await mount();
    await edit();
    expect(previews()).toEqual(['/first.jpg', '/second.jpg']);
    await click('[aria-label="Remover imagem 1"]');
    await change('#room-name', 'Sala Alterada');
    await change('#room-unit', 'unit-2');
    await submit();
    expect(await services.catalog.getRoomById(room.id)).toMatchObject({ name: 'Sala Alterada', unitId: 'unit-2', capacity: room.capacity, pricePerHour: room.pricePerHour, amenities: room.amenities, imageUrl: '/second.jpg', imageUrls: ['/second.jpg'] });
  });

  it('valida URLs, evita duplicação e limita galeria a seis imagens', async () => {
    await mount();
    await edit();
    await change('#room-image-url', 'invalido');
    await enter('#room-image-url');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('URL válida');
    await change('#room-image-url', '/one.jpg');
    await enter('#room-image-url');
    await change('#room-image-url', '/one.jpg');
    await click('[aria-label="Adicionar URL"]');
    expect(previews()).toHaveLength(1);
    for (let index = 2; index <= 7; index += 1) {
      await change('#room-image-url', `/image-${index}.jpg`);
      await click('[aria-label="Adicionar URL"]');
    }
    expect(previews()).toHaveLength(6);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('máximo 6');
    await submit();
    expect((await services.catalog.getRoomById(room.id))?.imageUrls).toHaveLength(6);
  });

  it('upload rejeita formato inválido e lote acima do limite', async () => {
    await mount();
    await edit();
    await upload([new File(['texto'], 'arquivo.txt', { type: 'text/plain' })]);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('JPEG, PNG ou WebP');
    expect(previews()).toHaveLength(0);
    await upload(Array.from({ length: 7 }, () => new File(['x'], 'sala.png', { type: 'image/png' })));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('máximo 6');
    expect(previews()).toHaveLength(0);
  });

  it('inclui resultado do processamento de upload na prévia e persistência', async () => {
    // O processamento de pixels exige canvas do navegador; substitui apenas essa fronteira.
    const image = 'data:image/webp;base64,dGVzdA==';
    vi.spyOn(imageUpload, 'prepareImageUpload').mockResolvedValueOnce(image);
    await mount();
    await edit();
    await upload([new File(['pixels'], 'sala.png', { type: 'image/png' })]);
    expect(previews()).toEqual([image]);
    await submit();
    expect(await services.catalog.getRoomById(room.id)).toMatchObject({ imageUrl: image, imageUrls: [image] });
  });

  it('adiciona comodidades por teclado e sugestões, sem duplicar caixa diferente', async () => {
    await mount();
    await click('.admin-rooms-page__intro button');
    await change('#room-amenity', '  Wi-Fi  ');
    await enter('#room-amenity');
    await change('#room-amenity', 'wi-fi');
    await click('[aria-label="Adicionar comodidade"]');
    expect(container.querySelectorAll('.admin-room-form__tags button')).toHaveLength(1);
    await click('.admin-room-form__suggestions button');
    expect(container.querySelectorAll('.admin-room-form__tags button')).toHaveLength(2);
    await click('.admin-room-form__tags button:first-child');
    await change('#room-name', 'Sala Conforto');
    await change('#room-capacity', '4');
    await change('#room-price', '50');
    await submit();
    expect((await services.catalog.getRoomsByUnitId('unit-1')).find((item) => item.name === 'Sala Conforto')?.amenities).toEqual(['Ar Condicionado']);
  });

  it('exclusão exige confirmação e bloqueia sala com reservas vinculadas', async () => {
    await mount();
    await click(`[aria-label="Excluir ${room.name}"]`);
    await click('.admin-room-modal--confirm .btn-secondary');
    expect(await services.catalog.getRoomById(room.id)).not.toBeNull();
    await services.bookings.create({ userId: 'test-user', unitId: room.unitId, roomId: room.id, date: '2026-08-10', timeSlot: '08:00 - 09:00', status: 'upcoming' });
    await click(`[aria-label="Excluir ${room.name}"]`);
    await click('.admin-room-danger');
    expect(container.querySelector('.admin-room-modal--confirm [role="alert"]')?.textContent).toContain('agendamentos vinculados');
    expect(await services.catalog.getRoomById(room.id)).not.toBeNull();
    await click('.admin-room-modal--confirm .btn-secondary');
    localStorage.setItem('c2w_mock_bookings', '[]');
    await click(`[aria-label="Excluir ${room.name}"]`);
    await click('.admin-room-danger');
    expect(await services.catalog.getRoomById(room.id)).toBeNull();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(9);
  });

  it('falha ao salvar mantém formulário e dados existentes', async () => {
    await mount();
    await edit();
    await change('#room-name', 'Não salvar');
    vi.spyOn(services.catalog, 'updateRoom').mockRejectedValueOnce(new Error('Falha de gravação'));
    await submit();
    expect(element<HTMLDialogElement>('.admin-room-modal').open).toBe(true);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Falha de gravação');
    expect((await services.catalog.getRoomById(room.id))?.name).toBe(room.name);
  });

  it('sem unidades, não permite abrir cadastro de sala', async () => {
    localStorage.setItem('c2w_mock_units', '[]');
    await mount();
    expect(element<HTMLButtonElement>('.admin-rooms-page__intro button').disabled).toBe(true);
    expect(container.textContent).toContain('Nenhuma sala encontrada');
  });
});
