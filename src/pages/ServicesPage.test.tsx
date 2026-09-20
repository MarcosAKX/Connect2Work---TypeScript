import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { services } from '../services';
import { AuthProvider } from '../state/AuthContext';
import type { BusinessService, User } from '../types/domain';
import { ServicesPage } from './ServicesPage';

const user: User = {
  id: 'client', name: '  Ana & João  ', email: 'cliente@example.com', role: 'client',
  active: true, createdAt: '2026-09-20', hasHoursPlan: false, hoursBalance: 0,
};
const items: BusinessService[] = [
  { id: 'fiscal', kind: 'fiscal_address', name: 'Endereço Fiscal', description: 'Descrição fiscal',
    primaryFeatures: ['Benefício fiscal'], secondaryFeatures: [], imageUrl: '/fiscal.jpg', active: true, sortOrder: 1 },
  { id: 'commercial', kind: 'commercial_address', name: 'Endereço Comercial', description: 'Descrição comercial',
    primaryFeatures: [], secondaryFeatures: [], imageUrl: null, active: true, sortOrder: 2 },
  { id: 'hours', kind: 'hours_plan', name: 'Plano de Horas', description: 'Descrição do plano',
    primaryFeatures: ['Uso mensal'], secondaryFeatures: ['Uso anual'], imageUrl: null, active: true, sortOrder: 3 },
];

describe('ServicesPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 20, 10));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(services.auth, 'getCurrentUser').mockReturnValue(user);
    vi.spyOn(services.businessServices, 'listServices').mockResolvedValue(items);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  async function mount() {
    await act(async () => root.render(<AuthProvider><ServicesPage /></AuthProvider>));
  }
  function element<T extends Element>(selector: string): T {
    const node = container.querySelector<T>(selector);
    if (!node) throw new Error(selector);
    return node;
  }
  it('apresenta catálogo, imagens, fallback e modalidades sem alterar ordem editorial', async () => {
    vi.mocked(services.businessServices.listServices).mockResolvedValue([...items].reverse());
    await mount();
    expect(services.businessServices.listServices).toHaveBeenCalledOnce();
    expect([...container.querySelectorAll('h2')].map((node) => node.textContent)).toEqual(items.map((item) => item.name));
    expect(element('img').getAttribute('src')).toBe('/fiscal.jpg');
    expect(container.querySelectorAll('.service-showcase__image-fallback')).toHaveLength(2);
    expect(element('.service-showcase--commercial').querySelector('ul')).toBeNull();
    expect(element('.service-showcase--hours').textContent).toContain('Flex mensalUso mensalFlex semestral/anualUso anual');
    expect(element('[aria-label="Serviços empresariais"]').getAttribute('aria-busy')).toBe('false');
  });
  it.each([[11, 'Bom dia'], [12, 'Boa tarde'], [18, 'Boa noite']] as const)('preserva saudação às %s e mensagem personalizada', async (hour, greeting) => {
    vi.setSystemTime(new Date(2026, 8, 20, hour));
    await mount();
    const links = container.querySelectorAll<HTMLAnchorElement>('.service-showcase__actions a');
    expect(links).toHaveLength(3);
    links.forEach((link, index) => {
      const item = items[index];
      if (!item) throw new Error('Link sem serviço correspondente');
      const url = new URL(link.href);
      expect(url.origin + url.pathname).toBe('https://wa.me/5517997529769');
      expect(url.searchParams.get('text')).toBe(`${greeting}, meu nome é Ana & João! Estou interessado em adquirir o serviço ${item.name}.`);
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noreferrer');
    });
  });
  it('usa cliente quando nome estiver vazio', async () => {
    vi.mocked(services.auth.getCurrentUser).mockReturnValue({ ...user, name: ' ' });
    await mount();
    expect(new URL(element<HTMLAnchorElement>('.service-showcase__actions a').href).searchParams.get('text')).toContain('meu nome é cliente!');
  });
  it('mantém carregamento e catálogo vazio', async () => {
    let resolve: (value: BusinessService[]) => void = () => { throw new Error('Promise não iniciada'); };
    vi.mocked(services.businessServices.listServices).mockReturnValue(new Promise((done) => { resolve = done; }));
    await mount();
    expect(element('.services-showcase').getAttribute('aria-busy')).toBe('true');
    await act(async () => resolve([]));
    expect(element('.services-showcase').getAttribute('aria-busy')).toBe('false');
    expect(container.querySelectorAll('article')).toHaveLength(0);
    expect(container.textContent).toContain('Atendimento nas unidades');
  });
});
