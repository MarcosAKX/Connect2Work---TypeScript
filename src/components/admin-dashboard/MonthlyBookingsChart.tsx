import { Link } from 'react-router-dom';
import { BuildingIcon, CalendarIcon } from '../icons';
import type { AdminDashboardData } from '../../hooks/useAdminDashboard';
import { useMonthlyBookingsChart } from '../../hooks/useMonthlyBookingsChart';

function getMonthEnd(key: string) {
  const [yearValue, monthValue] = key.split('-');
  return `${key}-${String(new Date(Number(yearValue), Number(monthValue), 0).getDate()).padStart(2, '0')}`;
}

export function MonthlyBookingsChart({ months, units }: { months: AdminDashboardData['monthlyBookings']; units: AdminDashboardData['chartUnits'] }) {
  const {
    range, setRange, unitId, setUnitId, showActive, setShowActive,
    showCancelled, setShowCancelled, visibleMonths, width, height,
    chartTop, chartBottom, step, y, cancelledPoints, selectedUnitName,
  } = useMonthlyBookingsChart(months, units);

  return <section className="admin-monthly-chart" aria-labelledby="monthly-bookings-title">
    <header>
      <div>
        <h2 id="monthly-bookings-title">Reservas nos últimos {range} meses</h2>
        <div className="admin-chart-legend" aria-label="Séries exibidas">
          <button
            type="button"
            className={`is-active${showActive ? ' is-visible' : ''}`}
            aria-pressed={showActive}
            onClick={() => { if (showCancelled || !showActive) setShowActive((value) => !value); }}
          >Ativas</button>
          <button
            type="button"
            className={`is-cancelled${showCancelled ? ' is-visible' : ''}`}
            aria-pressed={showCancelled}
            onClick={() => { if (showActive || !showCancelled) setShowCancelled((value) => !value); }}
          >Canceladas</button>
        </div>
      </div>
      <div className="admin-chart-controls">
        <div className="admin-chart-range" aria-label="Período do gráfico">
          <button type="button" className={range === 6 ? 'is-active' : ''} onClick={() => setRange(6)}>
            <CalendarIcon width="14" height="14" />6 meses
          </button>
          <button type="button" className={range === 12 ? 'is-active' : ''} onClick={() => setRange(12)}>12 meses</button>
        </div>
        <label>
          <BuildingIcon width="14" height="14" /><span className="sr-only">Filtrar gráfico por unidade</span>
          <select value={unitId} onChange={(event) => setUnitId(event.target.value)}>
            <option value="">Todas as unidades</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </label>
      </div>
    </header>
    <div className="admin-chart-canvas" role="group" aria-label={`Gráfico de reservas por mês${selectedUnitName ? ` na unidade ${selectedUnitName}` : ''}`}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="0" x2={width} y1={chartTop + line * 42} y2={chartTop + line * 42} className="admin-chart-gridline" />)}
        {showActive && visibleMonths.map((month, index) => <rect key={month.key} x={index * step + step * 0.39} y={y(month.active)} width={step * 0.22} height={Math.max(2, chartBottom - y(month.active))} className="admin-chart-bar" />)}
        {showActive && <polyline points={visibleMonths.map((month, index) => `${index * step + step / 2},${y(month.active)}`).join(' ')} className="admin-chart-line is-active" />}
        {showCancelled && <polyline points={cancelledPoints} className="admin-chart-line is-cancelled" />}
        {showActive && visibleMonths.map((month, index) => <circle key={`active-${month.key}`} cx={index * step + step / 2} cy={y(month.active)} r="4" className="admin-chart-point is-active" />)}
        {showCancelled && visibleMonths.map((month, index) => <circle key={`cancelled-${month.key}`} cx={index * step + step / 2} cy={y(month.cancelled)} r="4" className="admin-chart-point is-cancelled" />)}
      </svg>
      <div className={`admin-chart-months range-${range}`}>{visibleMonths.map((month) => {
        const query = new URLSearchParams({ de: `${month.key}-01`, ate: getMonthEnd(month.key) });
        if (unitId) query.set('unidade', unitId);
        return (
          <Link
            to={`/admin/agendamentos?${query.toString()}`}
            key={month.key}
            aria-label={`${month.label}: ${month.active} ativas e ${month.cancelled} canceladas`}
          >
            <span>{month.label}</span>
            <span className="admin-chart-tooltip" role="tooltip">
              <strong>{month.label}{selectedUnitName ? ` · ${selectedUnitName}` : ''}</strong>
              <span><i className="is-active" />Ativas <b>{month.active}</b></span>
              <span><i className="is-cancelled" />Canceladas <b>{month.cancelled}</b></span>
            </span>
          </Link>
        );
      })}</div>
    </div>
  </section>;
}
