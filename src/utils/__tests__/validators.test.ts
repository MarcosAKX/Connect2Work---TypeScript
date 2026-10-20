import { describe, expect, it } from 'vitest';
import { fullNameError, professionError } from '../validators';
describe('nome e profissao sem numeros', () => {
  it.each(['Maria 123', 'Maria ١٢٣', 'Maria １２３', 'Maria ² Silva'])('rejeita numeros no nome: %s', value => { expect(fullNameError(value)).toBe('O nome não pode conter números.'); });
  it.each(['Designer 3D', 'Professor ١', 'Analista ２', 'Técnico ²'])('rejeita numeros na profissao: %s', value => { expect(professionError(value)).toBe('A profissão não pode conter números.'); });
  it('preserva acentos e pontuacao', () => {
    expect(fullNameError("João D'Ávila")).toBeNull();
    expect(fullNameError('Ana-Maria Silva')).toBeNull();
    expect(professionError('Técnica em saúde')).toBeNull();
  });
});