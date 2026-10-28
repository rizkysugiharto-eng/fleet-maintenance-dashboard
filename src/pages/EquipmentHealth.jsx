// Kondisi Unit: satu kartu per unit, seperti nomor lambung di bodi alat.
// Status memakai warna tag LOTO di workshop: merah = B/D (jangan dioperasikan),
// kuning = perlu dicek, hijau = RFU (siap pakai). Klik kartu untuk membuka detail unit.

import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import UnitIllustration from '../components/UnitIllustration.jsx';
import { StatusTag, UnitPlate } from '../components/Workshop.jsx';
import { useData } from '../context/DataContext.jsx';
import { formatHours, formatNumber, formatPercent } from '../lib/format.js';
import { TARGETS } from '../lib/kpi.js';
import { unitConditions } from '../lib/planning.js';

const LEVELS = [
  { level: 'critical', text: 'B/D' },
  { level: 'warning', text: 'Perlu dicek' },
  { level: 'good', text: 'RFU' },
];
const CARD_TAG = { critical: 'B/D · Do not operate' };

export default function EquipmentHealth() {
  const { units, workOrders, data, hmIndex, refTime, openUnit } = useData();
  const [filters, setFilters] = useState({ search: '', type: '', level: '' });

  const rows = useMemo(
    () => unitConditions({ units, workOrders, pmLogs: data.pmLogs, hmIndex, refTime }),
    [units, workOrders, data.pmLogs, hmIndex, refTime],
  );

  const types = [...new Set(units.map((u) => u.type))].sort();
  const search = filters.search.trim().toUpperCase();
  const shown = rows.filter(
    (r) =>
      (!search || r.unit.code.includes(search)) &&
      (!filters.type || r.unit.type === filters.type) &&
      (!filters.level || r.level === filters.level),
  );
  const count = (level) => rows.filter((r) => r.level === level).length;
  const setLevel = (level) => setFilters({ ...filters, level: filters.level === level ? '' : level });

  return (
    <div className="page">
      <PageHeader step={2} title="Kondisi Unit">
        Kondisi setiap unit dalam 30 hari terakhir. Merah = B/D (jangan dioperasikan), kuning = perlu dicek, hijau = RFU (siap
        pakai). Klik kartu untuk membuka detail unit.
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
        <div className="seg-group" role="group" aria-label="Saring menurut kondisi">
          <button type="button" className="seg" aria-pressed={filters.level === ''} onClick={() => setFilters({ ...filters, level: '' })}>
            Semua <b>{rows.length}</b>
          </button>
          {LEVELS.map(({ level, text }) => (
            <button key={level} type="button" className="seg" aria-pressed={filters.level === level} onClick={() => setLevel(level)}>
              <StatusTag level={level}>{text}</StatusTag>
              <b>{count(level)}</b>
            </button>
          ))}
        </div>
      </div>

      <div className="unit-grid">
        {shown.map(({ unit, kpi, pm, level, reasons }) => (
          <button
            key={unit.code}
            type="button"
            className="unit-card"
            onClick={() => openUnit(unit.code)}
          >
            <span className={`edge edge-${level}`} />
            <span className="unit-card-body">
              <span className="unit-card-head">
                <UnitPlate code={unit.code} />
                <StatusTag level={level}>{CARD_TAG[level]}</StatusTag>
              </span>
              <span className="unit-card-type">
                <UnitIllustration type={unit.type} width={64} />
                <span>
                  {unit.type} · {[unit.brand, unit.model].filter(Boolean).join(' ') || 'Model tidak tercatat'} · Site {unit.siteId}
                </span>
              </span>
              <span className="unit-stats">
                <span>
                  PA 30 hari<b className={kpi.pa != null && kpi.pa < TARGETS.pa.value ? 'off' : undefined}>{formatPercent(kpi.pa)}</b>
                </span>
                <span>
                  MTBF<b>{kpi.mtbf == null ? '–' : formatHours(kpi.mtbf).replace(' jam', ' j')}</b>
                </span>
                <span>
                  HM ke PM<b className={pm?.remaining != null && pm.remaining < 0 ? 'off' : undefined}>{pm?.remaining == null ? '–' : formatNumber(pm.remaining)}</b>
                </span>
              </span>
              <span className="unit-card-reason">{reasons.length > 0 ? reasons.join(' · ') : 'Siap operasi'}</span>
            </span>
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="alert alert-info">Tidak ada unit yang cocok dengan filter.</p>}
    </div>
  );
}
