import type { AuditAction, AuditLog } from '../types/domain';

export const actionLabels: Record<AuditAction, string> = {
  create: 'Criou',
  update: 'Atualizou',
  delete: 'Excluiu',
  cancel: 'Cancelou',
  confirm: 'Confirmou',
  check_in: 'Fez check-in',
  renew: 'Renovou',
  import: 'Restaurou',
};

export const entityLabels: Record<AuditLog['entity'], string> = {
  user: 'usuário',
  unit: 'unidade',
  room: 'sala',
  business_service: 'serviço',
  booking: 'agendamento',
  task: 'tarefa',
  hours_plan: 'plano de horas',
  backup: 'backup',
};
