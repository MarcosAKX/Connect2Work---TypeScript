import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dadosServico } from '../src/services/validacao-catalogo';

test('serviços validam tipo, benefícios, ordem e imagem sem aceitar URL arbitrária', () => {
  const body = { kind: 'fiscal_address', name: 'Endereço Fiscal', description: 'Descrição', primaryFeatures: ['Benefício'], secondaryFeatures: [], active: true, sortOrder: 0, imageId: null };
  assert.equal(dadosServico(body).kind, 'fiscal_address');
  for (const change of [{ kind: 'outro' }, { active: 'true' }, { sortOrder: -1 }, { primaryFeatures: ['x'.repeat(501)] }, { secondaryFeatures: Array(31).fill('a') }, { imageId: 'https://example.invalid/img' }]) {
    assert.throws(() => dadosServico({ ...body, ...change }), { status: 400 });
  }
});
