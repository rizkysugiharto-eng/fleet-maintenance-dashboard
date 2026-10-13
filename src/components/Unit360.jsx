// Panel "Detail unit": semua informasi satu unit dalam satu tempat —
// ringkasan, riwayat WO, hour meter, dan tren KPI, semuanya mengikuti pilihan periode.

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

const TABS = ['Ringkasan', 'Riwayat WO', 'Hour Meter', 'Tren KPI'];

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

  const hmPoints = useMemo(() => (unit ? (hmIndex.get(unit.code) ?? []).slice(1) : []), [unit, hmIndex]);
  // "Semua" dimulai dari pembacaan HM pertama unit ini, bukan dari tahun 2000
  const dataStart = hmPoints.length ? hmPoints[0].t - DAY : refTime - 365 * DAY;
  const from = period === 'all' ? Math.min(dataStart, refTime - 30 * DAY) : refTime - Number(period) * DAY;
  // Periode pendek ditampilkan per hari / per minggu, periode panjang per minggu / per bulan
  const short = period === '30' || period === '90';

  const summary = useMemo(
    () => unit && unitSummary({ unit, workOrders: data.workOrders, pmLogs: data.pmLogs, hmIndex, from, to: refTime, refTime }),
    [unit, data.workOrders, data.pmLogs, hmIndex, from, refTime],
  );

  const kpiTrend = useMemo(() => {
    if (!unit || tab !== 'Tren KPI') return [];
    const buckets = buildBuckets(from, refTime, short ? 'week' : 'month');
    return kpiSeries({ units: [unit], workOrders: data.workOrders, hmIndex, buckets }).map((r) => ({ ...r, name: r.label }));
  }, [unit, tab, data.workOrders, hmIndex, from, refTime, short]);

  const hmSeries = useMemo(() => {
    if (tab !== 'Hour Meter') return [];
    const points = hmPoints.filter((p) => p.t - DAY >= from);
    const step = short ? 1 : 7;
    return points.filter((_, i, arr) => i % step === 0 || i === arr.length - 1).map((p) => ({ name: formatDateMs(p.t - DAY), hm: p.hm }));
  }, [tab, hmPoints, from, short]);

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
            {s.history.length} WO dalam periode ini. Jenis: {Object.keys(WO_TYPES).join(', ')}.
          </p>
          <WorkOrderTable workOrders={s.history} showUnit={false} limit={100} />
        </>
      )}

      {tab === 'Hour Meter' && (
        <>
          <p className="muted small">
            HM per {short ? 'hari' : 'minggu'}. Kemiringan garis = jam kerja unit; garis datar = unit tidak beroperasi.
          </p>
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

      {tab === 'Tren KPI' && (
        <>
          <p className="muted small">PA dan MA per {short ? 'minggu' : 'bulan'} dalam periode yang dipilih.</p>
          <TrendLineChart
            data={kpiTrend}
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
