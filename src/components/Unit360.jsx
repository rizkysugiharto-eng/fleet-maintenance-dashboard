// Panel "Detail unit": semua informasi satu unit dalam satu tempat —
// ringkasan, riwayat WO, hour meter, dan tren KPI, semuanya mengikuti pilihan periode.

import { useMemo, useState } from 'react';
import UnitIllustration from './UnitIllustration.jsx';
import { Odometer, StatusTag, UnitPlate } from './Workshop.jsx';
import { useData } from '../context/DataContext.jsx';
import { WO_TYPES } from '../data/catalog.js';
import { formatDateMs, formatHours, formatNumber, formatPercent } from '../lib/format.js';
import { DAY, buildBuckets, kpiSeries, toMs } from '../lib/kpi.js';
import { PM_STATUS_LEVEL, unitConditions, unitSummary } from '../lib/planning.js';
import { useChartColors } from '../lib/useChartColors.js';
import { LevelBadge } from './Badges.jsx';
import { TrendLineChart } from './Charts.jsx';
import Modal from './Modal.jsx';
import WorkOrderTable from './WorkOrderTable.jsx';
import TableWrap from './TableWrap.jsx';

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

  // Status unit (B/D / perlu dicek / RFU) memakai aturan yang sama dengan halaman Kondisi Unit
  const condition = useMemo(
    () => unit && unitConditions({ units: [unit], workOrders: data.workOrders, pmLogs: data.pmLogs, hmIndex, refTime })[0],
    [unit, data.workOrders, data.pmLogs, hmIndex, refTime],
  );

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
  const tabIndex = TABS.indexOf(tab);
  // Panah kiri/kanan, Home, End berpindah tab (pola tab WAI-ARIA)
  const onTabKey = (e) => {
    const next = { ArrowRight: tabIndex + 1, ArrowLeft: tabIndex - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const i = (next + TABS.length) % TABS.length;
    setTab(TABS[i]);
    document.getElementById(`u360-tab-${i}`)?.focus();
  };
  const pmProgress = f?.remaining == null ? null : Math.min(1, Math.max(0, 1 - f.remaining / unit.pmInterval));

  return (
    <Modal title={`Detail unit ${unit.code}`} onClose={() => openUnit(null)}>
      <div className="unit-hero">
        <UnitIllustration type={unit.type} width={120} />
        <div className="unit-hero-id">
          <UnitPlate code={unit.code} size="lg" />
          <span className="muted small">
            {unit.type} · {[unit.brand, unit.model].filter(Boolean).join(' ') || 'Model tidak tercatat'} · Site {unit.siteId}
          </span>
        </div>
        <div className="unit-hero-status">
          <StatusTag level={condition.level}>{condition.level === 'critical' ? 'B/D · Do not operate' : undefined}</StatusTag>
          <span className="small">
            {condition.active ? `${condition.active.id} · ${condition.reasons[0]}` : condition.reasons.join(' · ') || 'Siap operasi'}
          </span>
        </div>
      </div>
      <div className="tabs">
        <div role="tablist" aria-label="Detail unit" className="tablist" onKeyDown={onTabKey}>
          {TABS.map((t, i) => (
            <button
              key={t}
              id={`u360-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={tab === t}
              aria-controls="u360-panel"
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
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

      <div role="tabpanel" id="u360-panel" aria-labelledby={`u360-tab-${tabIndex}`} className="u360-panel" tabIndex={0}>
      {tab === 'Ringkasan' && (
        <>
          <div className="meter-grid">
            <section className="meter-box" aria-labelledby="u360-hm">
              <h3 id="u360-hm" className="stat-label">
                Hour meter
              </h3>
              {s.hmStatus.hm == null ? <p className="muted">Belum ada pembacaan HM.</p> : <Odometer value={s.hmStatus.hm} />}
              <p className="muted small">Rata-rata {formatNumber(s.hmStatus.ewh, 1)} HM/hari</p>
            </section>
            <section className="meter-box" aria-labelledby="u360-pm">
              <h3 id="u360-pm" className="stat-label">
                Servis berikutnya
              </h3>
              {f ? (
                <>
                  <p className="meter-big">
                    {f.pmType}{' '}
                    <span className={f.remaining < 0 ? 'status-critical' : undefined}>
                      {f.remaining < 0 ? `lewat ${formatNumber(-f.remaining)} HM` : `sisa ${formatNumber(f.remaining)} HM`}
                    </span>
                  </p>
                  {pmProgress != null && (
                    <div className={`pm-bar${f.remaining < 0 ? ' over' : ''}`} aria-hidden="true">
                      <span style={{ width: `${pmProgress * 100}%` }} />
                    </div>
                  )}
                  <p className="muted small">
                    Jadwal di HM {formatNumber(f.due)} · <LevelBadge level={PM_STATUS_LEVEL[f.status]}>{f.status}</LevelBadge> · estimasi{' '}
                    {formatDateMs(f.estDate)}
                  </p>
                </>
              ) : (
                <p className="muted">Unit ini tidak punya jadwal PM.</p>
              )}
            </section>
          </div>
          <div className="stat-grid">
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
          </div>
          <h2>Komponen / kerusakan tersering</h2>
          <TableWrap label="Tabel kerusakan tersering">
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
          </TableWrap>
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
      </div>
    </Modal>
  );
}
