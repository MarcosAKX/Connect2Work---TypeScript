import { useMemo, useState } from 'react';
import type { AdminDashboardData } from './useAdminDashboard';

export function useMonthlyBookingsChart(
  months: AdminDashboardData['monthlyBookings'],
  units: AdminDashboardData['chartUnits'],
) {
  const [range, setRange] = useState<6 | 12>(6);
  const [unitId, setUnitId] = useState('');
  const [showActive, setShowActive] = useState(true);
  const [showCancelled, setShowCancelled] = useState(true);
  const visibleMonths = useMemo(() => months.slice(-range).map((month) => {
    const values = unitId ? month.byUnit[unitId] ?? { active: 0, cancelled: 0 } : month;
    return { ...month, active: values.active, cancelled: values.cancelled };
  }), [months, range, unitId]);
  const maximum = Math.max(5, ...visibleMonths.flatMap(({ active, cancelled }) => [active, cancelled]));
  const width = 720;
  const height = 220;
  const chartTop = 16;
  const chartBottom = 184;
  const step = width / visibleMonths.length;
  const y = (value: number) => chartBottom - (value / maximum) * (chartBottom - chartTop);
  const cancelledPoints = visibleMonths.map((month, index) => `${index * step + step / 2},${y(month.cancelled)}`).join(' ');
  const selectedUnitName = units.find(({ id }) => id === unitId)?.name;


  return {
    range, setRange, unitId, setUnitId, showActive, setShowActive,
    showCancelled, setShowCancelled, visibleMonths, width, height,
    chartTop, chartBottom, step, y, cancelledPoints, selectedUnitName,
  };
}
