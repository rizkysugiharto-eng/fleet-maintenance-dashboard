// Panel "Detail unit": semua informasi satu unit dalam satu tempat —
// ringkasan, riwayat WO, hour meter, dan tren KPI bulanan.

import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { WO_TYPES } from '../data/catalog.js';
import { formatDateMs, formatHours, formatNumber, formatPercent } from '../lib/format.js';
import { DAY, buildBuckets, kpiSeries, toMs } from '../lib/kpi.js';
import { PM_STATUS_LEVEL, unitSummary } from '../lib/planning.js';
import { useChartColors } from '../lib/useChartColors.js';
import { LevelBadge } from './Badges.jsx';
import { TrendLineChart } from './Charts.jsx';
import Modal from './Modal.jsx';
import WorkOrderTable from './WorkOrderTable.jsx';

const TABS = ['Ringkasan', 'Riwayat WO', 'Hour Meter', 'KPI Bulanan'];

function Stat({ label, value, note }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

export default function Unit360() {
  const { unit360, openUnit, unitByCode, data, hmIndex, refTime } = useData();
  const unit = unitByCode.get(unit360);
  const colors = useChartColors();
  const [tab, setTab] = useState(TABS[0]);
  const [period, setPeriod] = useState('365');

  const from = period === 'all' ? toMs('2000-01-01') : refTime - Number(period) * DAY;
  const summary = useMemo(
    () => unit && unitSummary({ unit, workOrders: data.workOrders, pmLogs: data.pmLogs, hmIndex, from, to: refTime, refTime }),
    [unit, data.workOrders, data.pmLogs, hmIndex, from, refTime],
  );

  const monthly = useMemo(() => {
    if (!unit || tab !== 'KPI Bulanan') return [];
    const buckets = buildBuckets(refTime - 365 * DAY, refTime, 'month');
    return kpiSeries({ units: [unit], workOrders: data.workOrders, hmIndex, buckets }).map((r) => ({ ...r, name: r.label }));
  }, [unit, tab, data.workOrders, hmIndex, refTime]);

  const hmSeries = useMemo(() => {
    if (!unit || tab !== 'Hour Meter') return [];
    return (hmIndex.get(unit.code) ?? []).slice(1).filter((_, i, arr) => i % 7 === 0 || i === arr.length - 1).map((p) => ({ name: formatDateMs(p.t - DAY), hm: p.hm }));
  }, [unit, tab, hmIndex]);

  if (!unit) return null;
  const s = summary;
  const f = s.forecast;

  return (
    <Modal title={`Detail unit ${unit.code}`} onClose={() => openUnit(null)}>
      <p className="muted">
        {unit.type} · {[unit.brand, unit.model].filter(Boolean).join(' ') || 'Model tidak tercatat'} · Site {unit.siteId}
      </p>
      <div className="tabs" role="tablist" aria-label="Detail unit">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <label className="field">
          Periode
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="30">30 hari</option>
            <option value="90">90 hari</option>
            <option value="365">365 hari</option>
            <option value="all">Semua</option>
          </select>
        </label>
      </div>

      {tab === 'Ringkasan' && (
        <>
          <div className="stat-grid">
            <Stat label="HM saat ini" value={formatNumber(s.hmStatus.hm)} note={`Rata-rata ${formatNumber(s.hmStatus.ewh, 1)} HM/hari`} />
            <Stat
              label="Breakdown aktif"
              value={s.activeBreakdown ? 'Ada' : 'Tidak ada'}
              note={s.activeBreakdown ? `${s.activeBreakdown.id} · ${s.activeBreakdown.status}` : 'Unit siap operasi'}
            />
            <Stat label="Backlog terbuka" value={formatNumber(s.openBacklog)} note="WO belum selesai" />
            <Stat label="Total downtime" value={formatHours(s.downtimeHours)} note="Dalam periode ini" />
            <Stat label="BD tak terjadwal" value={formatNumber(s.unscheduledCount)} note="BM + BAC" />
            <Stat label="WO terjadwal" value={formatNumber(s.scheduledCount)} note="PM + CM" />
            <Stat label="PA" value={formatPercent(s.kpi.pa)} note="Physical Availability" />
            <Stat
              label="Repeat rate"
              value={formatPercent(s.repeatRate)}
              note={`${s.repeats} dari ${s.unscheduledCount} BD berulang ≤30 hari`}
            />
            <Stat
              label="HM ke PM"
              value={f ? formatNumber(f.remaining) : '–'}
              note={f ? `${f.pmType} di HM ${formatNumber(f.due)}` : 'Tidak ada jadwal'}
            />
          </div>
          {f && (
            <p className="muted small">
              Status PM: <LevelBadge level={PM_STATUS_LEVEL[f.status]}>{f.status}</LevelBadge> · estimasi {formatDateMs(f.estDate)}
            </p>
          )}
          <h2>Komponen / kerusakan tersering</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Komponen | masalah</th>
                  <th className="num">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {s.topComponents.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td className="num">{c.value}</td>
                  </tr>
                ))}
                {s.topComponents.length === 0 && (
                  <tr>
                    <td colSpan={2} className="empty">
                      Tidak ada breakdown di periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'Riwayat WO' && (
        <>
          <p className="muted small">
            {s.history.length} WO tercatat. Jenis: {Object.keys(WO_TYPES).join(', ')}.
          </p>
          <WorkOrderTable workOrders={s.history} showUnit={false} limit={100} />
        </>
      )}

      {tab === 'Hour Meter' && (
        <>
          <p className="muted small">HM per minggu. Kemiringan garis = jam kerja unit; garis datar = unit tidak beroperasi.</p>
          <TrendLineChart
            data={hmSeries}
            series={[{ key: 'hm', name: 'HM', color: colors.series1 }]}
            formatValue={(v) => `HM ${formatNumber(v)}`}
            formatTick={(v) => formatNumber(v)}
            domain={['dataMin', 'dataMax']}
            height={220}
          />
        </>
      )}

      {tab === 'KPI Bulanan' && (
        <>
          <p className="muted small">PA dan MA per bulan, 12 bulan terakhir.</p>
          <TrendLineChart
            data={monthly}
            series={[
              { key: 'pa', name: 'PA', color: colors.series1 },
              { key: 'ma', name: 'MA', color: colors.series2 },
            ]}
            formatValue={formatPercent}
            formatTick={(v) => `${v}%`}
            domain={[0, 100]}
            height={220}
          />
          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: colors.series1 }} />
              PA
            </span>
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: colors.series2 }} />
              MA
            </span>
          </div>
        </>
      )}
    </Modal>
  );
}
