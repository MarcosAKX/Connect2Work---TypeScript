import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import { AdminBusinessServicesPage } from './AdminBusinessServicesPage';

describe('AdminBusinessServicesPage', () => {
  let root: Root;
  let container: HTMLDivElement;
  const show = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.open = false; } });
    localStorage.clear();
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
    vi.unstubAllGlobals();
    if (show) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', show);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (close) Object.defineProperty(HTMLDialogElement.prototype, 'close', close);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });
  async function mount() {
    await act(async () => root.render(<MemoryRouter><AdminBusinessServicesPage /></MemoryRouter>));
  }
  function element<T extends Element>(selector: string): T {
    const found = container.querySelector<T>(selector);
    if (!found) throw new Error(selector);
    return found;
  }
  async function click(selector: string) {
    await act(async () => element<HTMLButtonElement>(selector).click());
  }
  async function change(selector: string, value: string) {
    const input = element<HTMLInputElement | HTMLTextAreaElement>(selector);
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  async function save() {
    await act(async () => element('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  }
  it('lista serviços e cancela sem salvar', async () => {
    await mount();
    expect(container.querySelectorAll('article')).toHaveLength(3);
    await click('article button');
    await change('dialog input[maxlength="80"]', 'Não salvar');
    await click('dialog footer .btn-secondary');
    expect(container.querySelector('dialog')).toBeNull();
    expect((await services.businessServices.listServices()).some(item => item.name === 'Não salvar')).toBe(false);
  });
  it('valida, normaliza benefícios e salva conteúdo', async () => {
    await mount();
    await click('article button');
    await change('dialog input[maxlength="80"]', ' ');
    await save();
    expect(element('[role="alert"]').textContent).toBe('Informe nome e descrição.');
    await change('dialog input[maxlength="80"]', ' Novo nome ');
    await change('dialog textarea[maxlength="300"]', ' Nova descrição ');
    await change('dialog textarea[rows="6"]', ' Benefício A\n\n Benefício B ');
    await save();
    expect((await services.businessServices.listServices()).find(item => item.name === 'Novo nome')).toMatchObject({
      description: 'Nova descrição', primaryFeatures: ['Benefício A', 'Benefício B'],
    });
    expect(container.querySelector('dialog')).toBeNull();
    expect(element('[role="status"]').textContent).toContain('atualizado');
  });
  it('mostra duas colunas apenas no plano e permite ocultar serviço', async () => {
    await mount();
    const cards = [...container.querySelectorAll('article')];
    const card = cards.find(node => node.textContent?.includes('Plano de Horas'));
    if (!card) throw new Error('Plano ausente');
    await act(async () => card.querySelector('button')?.click());
    expect(container.querySelectorAll('dialog textarea[rows="6"]')).toHaveLength(2);
    await click('dialog input[type="checkbox"]');
    await save();
    expect((await services.businessServices.listServices()).some(item => item.kind === 'hours_plan')).toBe(false);
    expect(container.querySelector('article.is-inactive')).not.toBeNull();
  });
  it('preserva formulário quando serviço falha', async () => {
    vi.spyOn(services.businessServices, 'updateService').mockRejectedValueOnce(new Error('Falha de teste'));
    await mount();
    await click('article button');
    await save();
    expect(element('dialog [role="alert"]').textContent).toBe('Falha de teste');
  });
});
