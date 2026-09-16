import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import { AdminUnitsPage } from './AdminUnitsPage';
import * as imageUpload from '../utils/image-upload';

describe('AdminUnitsPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  beforeEach(async () => {
    vi.useFakeTimers();
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
    await services.auth.login('admin@connect2work.com', 'admin123');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    if (showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (close) Object.defineProperty(HTMLDialogElement.prototype, 'close', close);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  async function mount() {
    await act(async () => root.render(<MemoryRouter><AdminUnitsPage /></MemoryRouter>));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  async function click(selector: string) {
    await act(async () => element<HTMLButtonElement>(selector).click());
  }
  async function change(selector: string, value: string) {
    const input = element<HTMLInputElement>(selector);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  async function submit() {
    await act(async () => element('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  }
  it('mostra contagem real de salas', async () => {
    await mount();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect([...container.querySelectorAll('.admin-units-table__rooms')].map(node => node.textContent)).toEqual(['5', '5']);
  });
  it('valida obrigatórios e coordenadas antes de criar', async () => {
    await mount();
    await click('.admin-units-page__new');
    await submit();
    expect(element('[role="alert"]').textContent).toContain('nome e o endereço');
    await change('#unit-name', ' Unidade Nova ');
    await change('#unit-address', ' Rua Nova, 10 ');
    await change('#unit-latitude', '91');
    await submit();
    expect(element('[role="alert"]').textContent).toContain('coordenadas válidas');
    await change('#unit-latitude', '-20,9');
    await submit();
    expect(element('[role="alert"]').textContent).toContain('juntas');
    await change('#unit-longitude', '-48,5');
    await submit();
    expect((await services.catalog.getUnits()).find(unit => unit.name === 'Unidade Nova')).toMatchObject({
      address: 'Rua Nova, 10', latitude: -20.9, longitude: -48.5,
    });
    expect(container.querySelector('dialog')).toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    await act(async () => vi.advanceTimersByTime(5000));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
  it('edita unidade sem perder dados existentes', async () => {
    const unit = (await services.catalog.getUnits())[0];
    if (!unit) throw new Error('Unidade seed ausente');
    await mount();
    await click('tbody tr:first-child button');
    expect(element<HTMLInputElement>('#unit-address').value).toBe(unit.address);
    await change('#unit-name', 'Nome Editado');
    await submit();
    expect((await services.catalog.getUnits()).find(item => item.id === unit.id)).toMatchObject({
      name: 'Nome Editado', address: unit.address, imageUrl: unit.imageUrl,
    });
  });
  it('bloqueia exclusão com salas e permite cancelar', async () => {
    await mount();
    await click('tbody tr:first-child .is-danger');
    await click('.admin-danger-button');
    expect(element('[role="alert"]').textContent).toContain('salas');
    expect(await services.catalog.getUnits()).toHaveLength(2);
    await click('dialog .btn-secondary');
    expect(container.querySelector('dialog')).toBeNull();
  });
  it('exclui unidade vazia após confirmação', async () => {
    const unit = await services.catalog.createUnit({ name: 'Vazia', address: 'Rua 1', imageUrl: null });
    await mount();
    await click('[aria-label="Excluir Vazia"]');
    expect(await services.catalog.getUnits()).toHaveLength(3);
    await click('.admin-danger-button');
    expect((await services.catalog.getUnits()).some(item => item.id === unit.id)).toBe(false);
  });
  it('mantém formulário e dados quando serviço falha', async () => {
    vi.spyOn(services.catalog, 'updateUnit').mockRejectedValueOnce(new Error('Falha de teste'));
    await mount();
    await click('tbody tr:first-child button');
    await change('#unit-name', 'Não salvar');
    await submit();
    expect(element('[role="alert"]').textContent).toBe('Falha de teste');
    expect(container.querySelector('dialog')).not.toBeNull();
    expect((await services.catalog.getUnits()).some(item => item.name === 'Não salvar')).toBe(false);
  });
  it('exibe prévia, persiste upload e permite remover imagem', async () => {
    // Canvas não existe no jsdom: simula somente a fronteira de processamento.
    const image = 'data:image/webp;base64,dGVzdA==';
    vi.spyOn(imageUpload, 'prepareImageUpload').mockResolvedValueOnce(image);
    await mount();
    await click('tbody tr:first-child button');
    const input = element<HTMLInputElement>('#unit-image');
    Object.defineProperty(input, 'files', {
      configurable: true, value: [new File(['image'], 'foto.png', { type: 'image/png' })],
    });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    expect(element('img').getAttribute('src')).toBe(image);
    await submit();
    expect((await services.catalog.getUnits())[0]?.imageUrl).toBe(image);
    await click('tbody tr:first-child button');
    await click('.admin-unit-form__preview button');
    expect(container.querySelector('.admin-unit-form__preview')).toBeNull();
    await submit();
    expect((await services.catalog.getUnits())[0]?.imageUrl).toBeNull();
  });
  it('exibe estado vazio e abre cadastro', async () => {
    localStorage.setItem('c2w_mock_units', '[]');
    await mount();
    expect(element('.admin-units-empty').textContent).toContain('Nenhuma unidade');
    await click('.admin-units-empty button');
    expect(element('#unit-form-title').textContent).toBe('Nova Unidade');
  });
});
