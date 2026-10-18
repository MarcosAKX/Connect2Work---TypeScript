import { BadRequestException } from '@nestjs/common';
import type { DadosUsuario, Papel, ConsultaUsuarios } from '../dto/usuario-gerenciado.dto';
const ddds = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
export function invalido(): never { throw new BadRequestException('Dados inválidos. Confira os campos informados.'); }
export function objeto(input: unknown, permitidos: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalido();
  const body = Object.fromEntries(Object.entries(input));
  if (Object.keys(body).some(key => !permitidos.includes(key))) invalido();
  return body;
}
export function texto(value: unknown, max: number): string { if (typeof value !== 'string' || value.length > max) invalido(); return value.trim(); }
export function papel(value: unknown): Papel { if (value !== 'admin' && value !== 'client' && value !== 'secretaria') invalido(); return value; }
export function ativo(value: unknown): boolean { if (typeof value !== 'boolean') invalido(); return value; }
export function versao(value: unknown): string { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(value)) invalido(); return value; }
export function uuid(value: string): string { if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)) invalido(); return value; }
export function dados(body: Record<string, unknown>): DadosUsuario {
  const name = texto(body.name, 100).replace(/\s+/g, ' '); const email = texto(body.email, 254).toLowerCase();
  const profession = body.profession === undefined ? '' : texto(body.profession, 80);
  const raw = body.phone === undefined ? '' : texto(body.phone, 30); const phone = raw.replace(/[\s()+-]/g, '');
  if (name.length < 2 || /\p{N}/u.test(name) || /\p{N}/u.test(profession) || (profession && profession.length < 2)) invalido();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.includes('..')) invalido();
  if (raw && (!/^\d{10,11}$/.test(phone) || !ddds.has(phone.slice(0, 2)) || /^(\d)\1+$/.test(phone) || (phone.length === 11 && phone[2] !== '9'))) invalido();
  return { name, email, profession, phone, role: papel(body.role), active: ativo(body.active) };
}
export function consulta(input: unknown): ConsultaUsuarios {
  const body = objeto(input, ['search', 'role', 'active', 'page', 'pageSize']);
  const integer = (value: unknown, fallback: number, max: number): number => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d{1,5}$/.test(value)) invalido();
    const n = Number(value); if (n < 1 || n > max) invalido(); return n;
  };
  if (body.active !== undefined && body.active !== 'true' && body.active !== 'false') invalido();
  return { search: body.search === undefined ? '' : texto(body.search, 254), ...(body.role === undefined ? {} : { role: papel(body.role) }),
    ...(body.active === undefined ? {} : { active: body.active === 'true' }), page: integer(body.page, 1, 10000), pageSize: integer(body.pageSize, 50, 100) };
}
