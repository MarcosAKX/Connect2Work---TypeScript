import type { AdminHoursPlanViewModel } from '../../hooks/useAdminHoursPlanPage';

interface HoursPlanStatsProps {
  stats: AdminHoursPlanViewModel['plan']['stats'];
}

export function HoursPlanStats({ stats }: HoursPlanStatsProps) {
  return (
    <section className="hours-plan-stats" aria-label="Resumo dos planos">
      <article><span>Planos ativos</span><strong>{stats.active}</strong></article>
      <article className="is-current"><span>Em dia</span><strong>{stats.current}</strong></article>
      <article className="is-expired"><span>Vencidos</span><strong>{stats.expired}</strong></article>
      <article><span>Horas disponíveis</span><strong>{stats.availableHours}h</strong></article>
    </section>
  );
}
