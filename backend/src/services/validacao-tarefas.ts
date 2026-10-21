import { BadRequestException } from '@nestjs/common';
import { objeto, texto, uuid, versao } from './validacao-usuario-administrativo';
import { validarData } from '../domain/horario-comercial';
import type { DadosTarefa, CriacaoTarefa, EdicaoTarefa, ConsultaTarefas, SituacaoTarefa } from '../dto/tarefa.dto';

function dados(body: Record<string, unknown>): DadosTarefa {
  const title = texto(body.title, 200);
  if (!title || !['low', 'medium', 'high'].includes(String(body.priority))) throw new BadRequestException('Título ou prioridade inválidos.');
  const priority = body.priority;
  if (priority !== 'low' && priority !== 'medium' && priority !== 'high') throw new BadRequestException('Prioridade inválida.');
  return { title, description: body.description === undefined ? '' : texto(body.description, 1000),
    assignedTo: uuid(texto(body.assignedTo, 36)), priority };
}
const fields = ['title', 'description', 'assignedTo', 'priority'];
export function criarTarefa(input: unknown): CriacaoTarefa {
  const body = objeto(input, [...fields, 'requestId', 'dueDate']);
  const dueDate = texto(body.dueDate, 10);
  validarData(dueDate);
  return { ...dados(body), requestId: uuid(texto(body.requestId, 36)), dueDate };
}
export function editarTarefa(input: unknown): EdicaoTarefa {
  const body = objeto(input, [...fields, 'expectedVersion']);
  return { ...dados(body), expectedVersion: versao(body.expectedVersion) };
}
export function mudarSituacao(input: unknown): { status: SituacaoTarefa; expectedVersion: string } {
  const body = objeto(input, ['status', 'expectedVersion']);
  if (body.status !== 'todo' && body.status !== 'in_progress' && body.status !== 'done') throw new BadRequestException('Situação inválida.');
  return { status: body.status, expectedVersion: versao(body.expectedVersion) };
}
export function versaoExclusao(input: unknown): string { return versao(objeto(input, ['expectedVersion']).expectedVersion); }
export function consultaTarefas(input: unknown): ConsultaTarefas {
  const body = objeto(input, ['page', 'pageSize', 'ownership']);
  const number = (v: unknown, fallback: number, max: number) => {
    if (v === undefined) return fallback;
    if (typeof v !== 'string' || !/^\d{1,5}$/.test(v) || Number(v) < 1 || Number(v) > max) throw new BadRequestException('Página inválida.');
    return Number(v);
  };
  if (body.ownership !== undefined && body.ownership !== 'all' && body.ownership !== 'mine') throw new BadRequestException('Filtro inválido.');
  return { page: number(body.page, 1, 10000), pageSize: number(body.pageSize, 30, 100), ownership: body.ownership === 'mine' ? 'mine' : 'all' };
}
