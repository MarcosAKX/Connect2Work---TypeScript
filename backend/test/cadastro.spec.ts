import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verify } from 'argon2';
import { ServicoCadastro } from '../src/services/servico-cadastro';
import type { NovoUsuario } from '../src/repositories/contracts/repositorio-usuarios';
import { ServicoSenha } from '../src/security/servico-senha-argon2';
const input = { name: 'Maria Silva', email: ' MARIA@example.com ', profession: 'Designer', phone: '(11) 98765-4321', password: 'abc123' };
test('cadastro normaliza contatos, guarda hash verificavel e omite credenciais', async () => {
  let stored: NovoUsuario | undefined;
  const service = new ServicoCadastro({ async criar(user) { stored = user; } }, new ServicoSenha());
  const result = await service.cadastrar(input);
  assert.equal(result.email, 'maria@example.com');
  assert.equal(result.role, 'client');
  assert.equal(result.phone, '11987654321');
  assert.ok(stored);
  assert.equal(await verify(stored.senhaHash, input.password), true);
  assert.equal('password' in result, false);
  assert.equal('senhaHash' in result, false);
});
test('rejeita campos extras, tipos invalidos e senhas fora da politica antes de gravar', async () => {
  let writes = 0;
  const service = new ServicoCadastro({ async criar() { writes++; } }, new ServicoSenha());
  for (const body of [null, [], { ...input, role: 'admin' }, { ...input, password: '12345' }, { ...input, password: 'abc 123' }, { ...input, password: 'abc\t123' }, { ...input, password: 'abc\n123' }, { ...input, name: 3 }, { ...input, email: 'invalid' }, { ...input, phone: '111' }]) {
    await assert.rejects(service.cadastrar(body));
  }
  assert.equal(writes, 0);
});
test('aceita limite de 128 e hashes possuem salt aleatorio', async () => {
  const password = 'a'.repeat(128);
  const service = new ServicoSenha();
  const first = await service.gerar(password);
  const second = await service.gerar(password);
  assert.notEqual(first, second);
  assert.equal(await verify(first, password), true);
  assert.equal(await verify(first, 'incorreta'), false);
});
test('limita hashes simultaneos e libera vaga apos falha', async () => {
  const releases: Array<() => void> = [];
  const service = new ServicoCadastro({ async criar() {} }, { gerar() { return new Promise<string>(resolve => releases.push(() => resolve('hash'))); } });
  const first = service.cadastrar(input);
  const second = service.cadastrar(input);
  await assert.rejects(service.cadastrar(input), /Tente novamente/);
  assert.equal(releases.length, 2);
  releases.forEach(release => release());
  await Promise.all([first, second]);
  const third = service.cadastrar(input);
  releases[2]?.();
  await third;
  const failing = new ServicoCadastro({ async criar() {} }, { async gerar() { throw new Error('privado'); } });
  for (let i = 0; i < 3; i++) await assert.rejects(failing.cadastrar(input), /privado/);
});
test('API rejeita numeros Unicode em nome e profissao antes de gerar hash ou gravar', async () => {
  let writes = 0;
  let hashes = 0;
  const service = new ServicoCadastro({ async criar() { writes++; } }, { async gerar() { hashes++; return 'hash'; } });
  for (const digit of ['1', '١', '１', '²']) {
    await assert.rejects(service.cadastrar({ ...input, name: `Maria ${digit} Silva` }), /nome não pode conter números/);
    await assert.rejects(service.cadastrar({ ...input, profession: `Designer ${digit}` }), /profissão não pode conter números/);
  }
  assert.equal(writes, 0);
  assert.equal(hashes, 0);
  const user = await service.cadastrar({ ...input, name: "João D'Ávila", profession: 'Técnico em saúde' });
  assert.equal(user.name, "João D'Ávila");
  assert.equal(writes, 1);
});
test('cadastro envia somente prefixo de 128 ao hasher e rejeita espaço no sufixo', async () => {
  let captured = '';
  const service = new ServicoCadastro({ async criar() {} }, { async gerar(password) { captured = password; return 'hash'; } });
  await service.cadastrar({ ...input, password: 'a'.repeat(130) });
  assert.equal(captured, 'a'.repeat(128));
  await assert.rejects(service.cadastrar({ ...input, password: 'a'.repeat(128) + ' ' }));
});