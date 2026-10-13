// Kesehatan Unit: kartu per unit dengan status sederhana (Breakdown / Perlu perhatian / Sehat).
// Klik kartu untuk membuka detail unit.

import { useMemo, useState } from 'react';
import { LevelBadge } from '../components/Badges.jsx';
import { useData } from '../context/DataContext.jsx';
import { isUnscheduled } from '../data/catalog.js';
import { formatHours, formatNumber, formatPercent } from '../lib/format.js';
import { DAY, TARGETS, calcKpi } from '../lib/kpi.js';
import { pmForecast } from '../lib/planning.js';
import PageHeader from '../components/PageHeader.jsx';

const LEVEL_TEXT = { critical: 'Breakdown', warning: 'Perlu perhatian', good: 'Sehat' };

export default function EquipmentHealth() {
  const { units, workOrders, data, hmIndex, refTime, openUnit } = useData();
  const [filters, setFilters] = useState({ search: '', type: '', level: '' });

  const rows = useMemo(() => {
    const from = refTime - 30 * DAY;
    const forecast = new Map(pmForecast({ units, pmLogs: data.pmLogs, hmIndex, refTime }).map((f) => [f.unit.code, f]));
    return units.map((unit) => {
      const kpi = calcKpi({ units: [unit], workOrders, hmIndex, from, to: refTime });
      const active = workOrders.find((wo) => wo.unitCode === unit.code && !wo.end && isUnscheduled(wo.type));
      const pm = forecast.get(unit.code);
      const pmLate = pm && (pm.status === 'Terlambat' || pm.status === 'Jatuh tempo');
      const level = active ? 'critical' : kpi.pa < TARGETS.pa.value || pmLate ? 'warning' : 'good';
      const reasons = [
        active && `${active.component ?? 'Breakdown'} · ${active.status}`,
        !active && kpi.pa < TARGETS.pa.value && `PA 30 hari di bawah ${TARGETS.pa.value}%`,
        pmLate && `PM ${pm.status.toLowerCase()}`,
      ].filter(Boolean);
      return { unit, kpi, pm, level, reasons };
    });
  }, [units, workOrders, data.pmLogs, hmIndex, refTime]);

  const types = [...new Set(units.map((u) => u.type))].sort();
  const search = filters.search.trim().toUpperCase();
  const shown = rows.filter(
    (r) =>
      (!search || r.unit.code.includes(search)) &&
      (!filters.type || r.unit.type === filters.type) &&
      (!filters.level || r.level === filters.level),
  );
  const count = (level) => rows.filter((r) => r.level === level).length;

  return (
    <div className="page">
      <PageHeader
        step={2}
        title="Kondisi Unit"
        actions={
          <>
            <LevelBadge level="critical">{count('critical')} breakdown</LevelBadge>
            <LevelBadge level="warning">{count('warning')} perlu perhatian</LevelBadge>
            <LevelBadge level="good">{count('good')} sehat</LevelBadge>
          </>
        }
      >
        Kondisi setiap unit dalam 30 hari terakhir. Klik kartu untuk membuka detail unit.
      </PageHeader>

      <div className="card filters" role="group" aria-label="Filter unit">
        <label>
          Cari kode unit
          <input type="search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="contoh: DT-2" />
        </label>
        <label>
          Tipe unit
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Semua tipe</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Kondisi
          <select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
            <option value="">Semua kondisi</option>
            {Object.entries(LEVEL_TEXT).map(([level, text]) => (
              <option key={level} value={level}>
                {text}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="unit-grid">
        {shown.map(({ unit, kpi, pm, level, reasons }) => (
          <button key={unit.code} type="button" className={`unit-card level-${level}`} onClick={() => openUnit(unit.code)}>
            <div className="unit-card-head">
              <span className="unit-code">{unit.code}</span>
              <LevelBadge level={level}>{LEVEL_TEXT[level]}</LevelBadge>
            </div>
            <span className="muted small">
              {unit.type} · {[unit.brand, unit.model].filter(Boolean).join(' ') || `Site ${unit.siteId}`}
            </span>
            <div className="unit-stats">
              <span>
                PA 30h<b>{formatPercent(kpi.pa)}</b>
              </span>
              <span>
                MTBF<b>{kpi.mtbf == null ? '–' : formatHours(kpi.mtbf).replace(' jam', 'j')}</b>
              </span>
              <span>
                HM ke PM<b>{pm?.remaining == null ? '–' : formatNumber(pm.remaining)}</b>
              </span>
            </div>
            {reasons.length > 0 && <span className="small muted">{reasons.join(' · ')}</span>}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="alert alert-info">Tidak ada unit yang cocok dengan filter.</p>}
    </div>
  );
}
