import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { it, expect } from 'vitest';
import { UnitLocationCard } from './UnitLocationCard';
it('mostra salas cadastradas sem prometer disponibilidade de horário', () => {
  const html = renderToStaticMarkup(<MemoryRouter><UnitLocationCard unit={{ id: 'u', name: 'Centro', address: 'Rua', imageUrl: null, availableRooms: 1 }}
    selected={false} nearest={false} distance={undefined} selectUnit={() => {}} /></MemoryRouter>);
  expect(html).toContain('sala cadastrada'); expect(html).not.toContain('salas disponíveis');
});
