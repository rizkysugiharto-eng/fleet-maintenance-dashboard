// Halaman dashboard: filter → KPI → grafik.
// Semua angka dihitung ulang otomatis dari data work order setiap kali
// filter atau data berubah (seperti slicer di Power BI).

import { useMemo, useState } from 'react';
import ChartCard from '../components/ChartCard.jsx';
import { HorizontalBarChart, TrendLineChart } from '../components/Charts.jsx';
import KpiTile from '../components/KpiTile.jsx';
import { useData } from '../context/DataContext.jsx';
import { WO_TYPES } from '../data/dummy.js';
import {
  TARGET_PA,
  addMonths,
  breakdownByComponent,
  calcKpi,
  costByUnit,
  dataMonthRange,
  downtimeByType,
  monthStart,
  monthlyPa,
  paByUnit,
} from '../lib/kpi.js';
import {
  formatHours,
  formatMonth,
  formatNumber,
  formatPercent,
  formatRupiah,
  formatRupiahCompact,
} from '../lib/format.js';

const percentTick = (v) => `${v}%`;
const hoursValue = (v) => `${formatNumber(v)} jam`;
const costTick = (v) => (v === 0 ? '0' : v >= 1e9 ? `${formatNumber(v / 1e9, 1)} M` : `${formatNumber(v / 1e6)} jt`);

export default function Dashboard() {
  const { units, workOrders } = useData();
  const range = useMemo(() => dataMonthRange(workOrders), [workOrders]);
  const [filters, setFilters] = useState({
    fromMonth: range.min,
    toMonth: range.max,
    unitType: '',
    unitCode: '',
  });

  const setFilter = (key, value) =>
    setFilters((f) => ({ ...f, [key]: value, ...(key === 'unitType' ? { unitCode: '' } : {}) }));

  const unitTypes = [...new Set(units.map((u) => u.type))];
  const unitsOfType = units.filter((u) => !filters.unitType || u.type === filters.unitType);
  const selectedUnits = useMemo(
    () =>
      units.filter(
        (u) => (!filters.unitType || u.type === filters.unitType) && (!filters.unitCode || u.code === filters.unitCode),
      ),
    [units, filters.unitType, filters.unitCode],
  );
  const periodValid = filters.fromMonth && filters.toMonth && filters.fromMonth <= filters.toMonth;

  const results = useMemo(() => {
    if (!periodValid) return null;
    const args = {
      units: selectedUnits,
      workOrders,
      from: monthStart(filters.fromMonth),
      to: monthStart(addMonths(filters.toMonth, 1)),
    };
    return {
      kpi: calcKpi(args),
      paUnits: paByUnit(args).sort((a, b) => a.value - b.value),
      trend: monthlyPa({ units: selectedUnits, workOrders, fromMonth: filters.fromMonth, toMonth: filters.toMonth }),
      byType: downtimeByType(args).map((r) => ({ ...r, name: WO_TYPES[r.name] ?? r.name })),
      pareto: breakdownByComponent(args),
      cost: costByUnit(args),
    };
  }, [periodValid, selectedUnits, workOrders, filters.fromMonth, filters.toMonth]);

  return (
    <div className="page">
      <div className="page-title">
        <h1>Dashboard Maintenance &amp; Reliability</h1>
        <p className="muted">KPI armada alat berat, dihitung otomatis dari data work order.</p>
      </div>

      <div className="filters" role="group" aria-label="Filter dashboard">
        <label>
          Dari bulan
          <input type="month" value={filters.fromMonth} onChange={(e) => setFilter('fromMonth', e.target.value)} />
        </label>
        <label>
          Sampai bulan
          <input type="month" value={filters.toMonth} onChange={(e) => setFilter('toMonth', e.target.value)} />
        </label>
        <label>
          Tipe unit
          <select value={filters.unitType} onChange={(e) => setFilter('unitType', e.target.value)}>
            <option value="">Semua tipe</option>
            {unitTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Unit
          <select value={filters.unitCode} onChange={(e) => setFilter('unitCode', e.target.value)}>
            <option value="">Semua unit</option>
            {unitsOfType.map((u) => (
              <option key={u.code}>{u.code}</option>
            ))}
          </select>
        </label>
      </div>

      {!periodValid && <p className="alert">Bulan awal harus sama dengan atau sebelum bulan akhir.</p>}

      {results && (
        <>
          <div className="kpi-grid">
            <KpiTile
              hero
              label="Physical Availability (PA)"
              value={formatPercent(results.kpi.pa)}
              status={
                results.kpi.pa == null
                  ? null
                  : results.kpi.pa >= TARGET_PA
                    ? { level: 'good', text: `Memenuhi target ${TARGET_PA}%` }
                    : { level: 'critical', text: `Di bawah target ${TARGET_PA}%` }
              }
            />
            <KpiTile label="MTBF" value={formatHours(results.kpi.mtbf)} note={`${formatNumber(results.kpi.breakdownCount)} breakdown`} />
            <KpiTile label="MTTR" value={formatHours(results.kpi.mttr)} note="Rata-rata waktu perbaikan BM" />
            <KpiTile label="Jumlah work order" value={formatNumber(results.kpi.woCount)} note={`${formatNumber(results.kpi.downtimeHours)} jam downtime`} />
            <KpiTile label="Backlog (WO open)" value={formatNumber(results.kpi.backlog)} note="WO yang belum selesai" />
            <KpiTile label="Total biaya" value={formatRupiahCompact(results.kpi.cost)} note="Biaya WO dalam periode" />
          </div>

          <div className="chart-grid">
            <ChartCard
              title="PA per unit"
              subtitle="Diurutkan dari PA terendah"
              rows={results.paUnits}
              columns={[
                { label: 'Unit', render: (r) => r.name },
                { label: 'PA', numeric: true, render: (r) => formatPercent(r.value) },
              ]}
            >
              <HorizontalBarChart
                data={results.paUnits}
                formatValue={formatPercent}
                formatTick={percentTick}
                domainMax={100}
                target={TARGET_PA}
                targetLabel={`Target ${TARGET_PA}%`}
              />
            </ChartCard>

            <ChartCard
              title="Tren PA bulanan"
              subtitle="Unit sesuai filter"
              rows={results.trend}
              columns={[
                { label: 'Bulan', render: (r) => formatMonth(r.name) },
                { label: 'PA', numeric: true, render: (r) => formatPercent(r.value) },
              ]}
            >
              <TrendLineChart
                data={results.trend}
                formatValue={formatPercent}
                formatTick={percentTick}
                formatLabel={formatMonth}
                domain={[0, 100]}
                target={TARGET_PA}
                targetLabel={`Target ${TARGET_PA}%`}
              />
            </ChartCard>

            <ChartCard
              title="Pareto komponen breakdown"
              subtitle="Jam downtime BM per komponen"
              rows={results.pareto}
              columns={[
                { label: 'Komponen', render: (r) => r.name },
                { label: 'Downtime', numeric: true, render: (r) => hoursValue(r.value) },
              ]}
            >
              <HorizontalBarChart data={results.pareto} formatValue={hoursValue} formatTick={(v) => formatNumber(v)} />
            </ChartCard>

            <ChartCard
              title="Biaya maintenance per unit"
              subtitle="Diurutkan dari biaya tertinggi"
              rows={results.cost}
              columns={[
                { label: 'Unit', render: (r) => r.name },
                { label: 'Biaya', numeric: true, render: (r) => formatRupiah(r.value) },
              ]}
            >
              <HorizontalBarChart
                data={results.cost}
                formatValue={formatRupiahCompact}
                formatTick={costTick}
              />
            </ChartCard>
            <ChartCard
              title="Downtime per tipe maintenance"
              subtitle="Total jam downtime"
              rows={results.byType}
              columns={[
                { label: 'Tipe', render: (r) => r.name },
                { label: 'Downtime', numeric: true, render: (r) => hoursValue(r.value) },
              ]}
            >
              <HorizontalBarChart data={results.byType} formatValue={hoursValue} formatTick={(v) => formatNumber(v)} />
            </ChartCard>

          </div>
        </>
      )}
    </div>
  );
}
