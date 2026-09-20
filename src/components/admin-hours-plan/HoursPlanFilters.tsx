import type { AdminHoursPlanViewModel } from '../../hooks/useAdminHoursPlanPage';
import type { HoursPlanFilter } from '../../hooks/useAdminHoursPlan';

type HoursPlanFiltersProps = Pick<AdminHoursPlanViewModel['plan'], 'search' | 'setSearch' | 'filter' | 'setFilter'>;

export function HoursPlanFilters({ search, setSearch, filter, setFilter }: HoursPlanFiltersProps) {
  return (
    <div className="hours-plan-filters">
      <label>
        <span className="sr-only">Buscar usuário</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail..." />
      </label>
      <label>
        <span className="sr-only">Filtrar plano</span>
        <select value={filter} onChange={(event) => setFilter(event.target.value as HoursPlanFilter)}>
          <option value="all">Todos</option>
          <option value="with">Com plano</option>
          <option value="without">Sem plano</option>
          <option value="current">Em dia</option>
          <option value="expired">Vencidos</option>
        </select>
      </label>
    </div>
  );
}
