import { PoliticaSenha } from '../security/politica-senha';
import type { UsuarioCadastradoDto } from '../dto/usuario-cadastrado.dto';
import { randomUUID } from 'node:crypto';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { GeradorHash } from '../security/gerador-hash';
import type { NovoUsuario, RepositorioUsuarios } from '../repositories/contracts/repositorio-usuarios';

const ddds = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
function invalid(message: string): never { throw new BadRequestException(message); }
function text(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string') invalid('Dados de cadastro invalidos.');
  return value;
}
export class ServicoCadastro {
  private emAndamento = 0;
  constructor(private readonly repositorio: RepositorioUsuarios, private readonly senhas: GeradorHash) {}
  async cadastrar(input: unknown): Promise<UsuarioCadastradoDto> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Dados de cadastro invalidos.');
    // Type guard: entrada HTTP permanece unknown ate validacao.
    const body: Record<string, unknown> = Object.fromEntries(Object.entries(input));
    const keys = ['name', 'email', 'profession', 'phone', 'password'];
    if (Object.keys(body).some(key => !keys.includes(key))) invalid('Campo de cadastro nao permitido.');
    const name = text(body, 'name').trim().replace(/\s+/g, ' ');
    const email = text(body, 'email').trim().toLowerCase();
    const profession = text(body, 'profession').trim();
    const rawPhone = text(body, 'phone');
    const phone = rawPhone.replace(/[\s()+-]/g, '');
    const password = new PoliticaSenha().normalizar(text(body, 'password'));
    if (/\p{N}/u.test(name)) invalid('O nome não pode conter números.');
    if (/\p{N}/u.test(profession)) invalid('A profissão não pode conter números.');
    if (name.length > 100 || name.split(' ').length < 2 || name.split(' ').some(part => part.length < 2)) invalid('Informe seu nome e sobrenome.');
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.includes('..')) invalid('Digite um e-mail valido.');
    if (profession.length < 2 || profession.length > 80) invalid('Informe uma profissao entre 2 e 80 caracteres.');
    if (!/^\d{10,11}$/.test(phone) || !ddds.has(phone.slice(0,2)) || /^(\d)\1+$/.test(phone) || (phone.length === 11 && phone[2] !== '9')) invalid('Digite um telefone com DDD valido.');

    // Limita trabalho caro de hashing simultaneo nesta instancia local.
    if (this.emAndamento >= 2) throw new ServiceUnavailableException('Tente novamente em instantes.');
    this.emAndamento++;
    try {
      const senhaHash = await this.senhas.gerar(password);
      const user: NovoUsuario = { id: randomUUID(), name, email, profession, phone, senhaHash, createdAt: new Date().toISOString() };
      await this.repositorio.criar(user);
      return { id: user.id, name, email, profession, phone, role: 'client', active: true, createdAt: user.createdAt, hasHoursPlan: false, hoursBalance: 0 };
    } finally { this.emAndamento--; }
  }
}