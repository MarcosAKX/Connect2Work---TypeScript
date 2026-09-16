import type { AdminDailyPanelViewModel } from '../../hooks/useAdminDailyPanel';
export function DailyPanelFilters({
  data,
  search,
  setSearch,
  unitId,
  setUnitId,
  operationalFilter,
  setOperationalFilter,
  periodFilter,
  setPeriodFilter,
  hasActiveFilters,
  clearFilters,
}: Pick<
  AdminDailyPanelViewModel,
  | 'data'
  | 'search'
  | 'setSearch'
  | 'unitId'
  | 'setUnitId'
  | 'operationalFilter'
  | 'setOperationalFilter'
  | 'periodFilter'
  | 'setPeriodFilter'
  | 'hasActiveFilters'
  | 'clearFilters'
>) {
  return (
    <div
      className="admin-daily-filters"
      role="search"
      aria-label="Filtrar agenda de hoje"
    >
      <label className="admin-daily-filters__search">
        <span className="admin-filter-label">Buscar</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cliente ou sala"
        />
      </label>
      <label>
        <span className="admin-filter-label">Unidade</span>
        <select
          value={unitId}
          onChange={(event) => setUnitId(event.target.value)}
        >
          <option value="">Todas as unidades</option>
          {data.units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="admin-filter-label">Situação</span>
        <select
          value={operationalFilter}
          onChange={(event) =>
            setOperationalFilter(
              event.target.value === 'waiting' ||
                event.target.value === 'present' ||
                event.target.value === 'payment' ||
                event.target.value === 'checked-in' ||
                event.target.value === 'cancelled'
                ? event.target.value
                : 'all',
            )
          }
        >
          <option value="all">Todas as situações</option>
          <option value="waiting">Aguardando chegada</option>
          <option value="present">Presentes agora</option>
          <option value="payment">Pagamento pendente</option>
          <option value="checked-in">Check-in realizado</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </label>
      <label>
        <span className="admin-filter-label">Período</span>
        <select
          value={periodFilter}
          onChange={(event) =>
            setPeriodFilter(
              event.target.value === 'morning' ||
                event.target.value === 'afternoon' ||
                event.target.value === 'next'
                ? event.target.value
                : 'all',
            )
          }
        >
          <option value="all">Dia inteiro</option>
          <option value="morning">Manhã</option>
          <option value="afternoon">Tarde</option>
          <option value="next">Próximas 3 horas</option>
        </select>
      </label>
      {hasActiveFilters && (
        <button type="button" onClick={clearFilters}>
          Limpar filtros
        </button>
      )}
    </div>
  );
}
