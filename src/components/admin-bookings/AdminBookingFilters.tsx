import type { AdminBookingsViewModel } from '../../hooks/useAdminBookingsPage';

export function AdminBookingFilters({
  data,
}: Pick<AdminBookingsViewModel, 'data'>) {
  return (
    <div
      className="admin-bookings-filters"
      role="search"
      aria-label="Filtros de agendamentos"
    >
      <label className="admin-bookings-search">
        <span className="admin-filter-label">Buscar</span>
        <input
          value={data.search}
          onChange={(event) => data.setSearch(event.target.value)}
          placeholder="Cliente, sala, unidade ou ID"
        />
      </label>
      <label>
        <span className="admin-filter-label">Unidade</span>
        <select
          value={data.unitId}
          onChange={(event) => data.setUnitId(event.target.value)}
        >
          <option value="">Todas unidades</option>
          {data.units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="admin-filter-label">Status</span>
        <select
          value={data.status}
          onChange={(event) =>
            data.setStatus(
              event.target.value === 'confirmed' ||
                event.target.value === 'pending' ||
                event.target.value === 'cancelled'
                ? event.target.value
                : '',
            )
          }
        >
          <option value="">Todos</option>
          <option value="confirmed">Confirmado</option>
          <option value="pending">Pendente</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </label>
      <label className="admin-bookings-date">
        <span className="admin-filter-label">De</span>
        <input
          type="date"
          value={data.dateFrom}
          max={data.dateTo || undefined}
          onChange={(event) => data.setDateFrom(event.target.value)}
        />
      </label>
      <label className="admin-bookings-date">
        <span className="admin-filter-label">Até</span>
        <input
          type="date"
          value={data.dateTo}
          min={data.dateFrom || undefined}
          onChange={(event) => data.setDateTo(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="admin-bookings-show-all"
        onClick={data.showAllDates}
      >
        Mostrar todos
      </button>
    </div>
  );
}
