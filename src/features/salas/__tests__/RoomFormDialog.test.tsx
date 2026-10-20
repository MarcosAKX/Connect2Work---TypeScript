import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { RoomFormDialog } from '../RoomFormDialog';
vi.mock('../../../services', () => ({ services: {} }));
it('preserva os filhos diretos usados pelo CSS do formulário e bloqueia edição durante envio', () => {
  const html = renderToStaticMarkup(<RoomFormDialog room={null} units={[]} isSaving={true} gatewayError="" onCancel={() => {}} onSave={async () => false} />);
  const container = document.createElement('div'); container.innerHTML = html;
  expect(container.querySelector('.admin-room-form > header')).not.toBeNull();
  expect(container.querySelector('.admin-room-form > footer')).not.toBeNull();
  expect(container.querySelector('form')?.hasAttribute('inert')).toBe(true);
});
it('mantém a unidade atual no seletor quando ela não está entre as primeiras opções', () => {
  const room = { id: 's', unitId: 'u101', unitName: 'Unidade distante', name: 'Sala', capacity: 4, pricePerHour: 50, amenities: [], imageUrl: null };
  const html = renderToStaticMarkup(<RoomFormDialog room={room} units={[{ id: 'u1', name: 'Primeira' }]} isSaving={false} gatewayError="" onCancel={() => {}} onSave={async () => false} />);
  const container = document.createElement('div'); container.innerHTML = html;
  expect(container.querySelector('option[value="u101"]')?.hasAttribute('selected')).toBe(true);
});
