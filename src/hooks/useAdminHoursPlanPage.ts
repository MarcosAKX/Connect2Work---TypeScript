import { useState } from 'react';
import type { User } from '../types/domain';
import { useAdminHoursPlan } from './useAdminHoursPlan';
import type { PlanForm } from './useHoursPlanForm';

export function useAdminHoursPlanPage() {
  const plan = useAdminHoursPlan();
  const [editing, setEditing] = useState<User | null>(null);
  const [renewing, setRenewing] = useState<User | null>(null);

  async function save(value: PlanForm) {
    if (!editing) return;
    const saved = await plan.updatePlan(editing.id, {
      hasHoursPlan: value.enabled,
      hoursPlanTotal: value.enabled ? Number(value.total) : undefined,
      hoursBalance: value.enabled ? Number(value.balance) : 0,
      hoursPlanRenewsOn: value.enabled ? value.renewal : undefined,
    });
    if (saved) setEditing(null);
  }

  async function renew() {
    if (renewing && await plan.confirmRenewal(renewing.id)) setRenewing(null);
  }

  return { plan, editing, setEditing, renewing, setRenewing, save, renew };
}

export type AdminHoursPlanViewModel = ReturnType<typeof useAdminHoursPlanPage>;
