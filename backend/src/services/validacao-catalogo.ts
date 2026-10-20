import { BadRequestException } from '@nestjs/common';
import type { ConsultaCatalogo, DadosSala, DadosUnidade, DadosServico } from '../dto/catalogo-administrativo.dto';
import { objeto, texto, uuid } from './validacao-usuario-administrativo';
function invalid(): never { throw new BadRequestException('Dados do catálogo inválidos. Confira os campos.'); }
function name(value: unknown, max: number): string { const result = texto(value, max); if (!result) invalid(); return result; }
export function imagemId(value: unknown): string { if (typeof value !== 'string') invalid(); if (value.startsWith('legacy:')) uuid(value.slice(7)); else uuid(value); return value; }
export function dadosUnidade(body: Record<string, unknown>): DadosUnidade {
  const latitude = body.latitude ?? null; const longitude = body.longitude ?? null;
  if ((latitude === null) !== (longitude === null) || (latitude !== null && (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90)) || (longitude !== null && (typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180))) invalid();
  return { type: 'unit', name: name(body.name, 150), address: name(body.address, 500), description: body.description === undefined ? '' : texto(body.description, 5000), latitude, longitude,
    ...(body.imageId === undefined ? {} : { imageId: body.imageId === null ? null : imagemId(body.imageId) }) };
}
export function dadosSala(body: Record<string, unknown>): DadosSala {
  const capacity = body.capacity; const price = body.pricePerHour;
  if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 1 || capacity > 65535 || typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 9999999999.99 || Math.abs(price * 100 - Math.round(price * 100)) > 0.0001) invalid();
  if (typeof body.unitId !== 'string' || !Array.isArray(body.amenities) || body.amenities.length > 30) invalid();
  const amenities = [...new Set(body.amenities.map((item: unknown) => name(item, 100).replace(/\s+/g, ' ')))];
  const result: DadosSala = { type: 'room', unitId: uuid(body.unitId), name: name(body.name, 150), capacity, pricePerHour: price, amenities };
  if (body.imageIds !== undefined) { if (!Array.isArray(body.imageIds) || body.imageIds.length > 6) invalid(); result.imageIds = body.imageIds.map(imagemId); if (new Set(result.imageIds).size !== result.imageIds.length) invalid(); }
  return result;
}
export function consultaCatalogo(input: unknown): ConsultaCatalogo {
  const body = objeto(input, ['page','pageSize','search','unitId']);
  const number = (v: unknown, fallback: number, max: number) => { if (v === undefined) return fallback; if (typeof v !== 'string' || !/^\d{1,5}$/.test(v) || Number(v) < 1 || Number(v) > max) invalid(); return Number(v); };
  return { page: number(body.page, 1, 10000), pageSize: number(body.pageSize, 50, 100), search: body.search === undefined ? '' : texto(body.search, 254), ...(body.unitId === undefined ? {} : { unitId: uuid(texto(body.unitId, 36)) }) };
}

export function dadosServico(body: Record<string, unknown>): DadosServico {
  const kind = body.kind;
  if (kind !== 'fiscal_address' && kind !== 'commercial_address' && kind !== 'hours_plan') invalid();
  if (typeof body.active !== 'boolean' || typeof body.sortOrder !== 'number' || !Number.isInteger(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 65535) invalid();
  const features = (v: unknown): string[] => {
    if (!Array.isArray(v) || v.length > 30) invalid();
    return v.map((item: unknown) => name(item, 500));
  };
  return { type: 'service', kind, name: name(body.name, 150), description: name(body.description, 5000), primaryFeatures: features(body.primaryFeatures), secondaryFeatures: features(body.secondaryFeatures), active: body.active, sortOrder: body.sortOrder,
    ...(body.imageId === undefined ? {} : { imageId: body.imageId === null ? null : imagemId(body.imageId) }) };
}
