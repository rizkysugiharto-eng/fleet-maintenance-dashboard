// Halaman Dashboard: filter → KPI → grafik.
// Semua angka dihitung ulang otomatis setiap kali filter atau data berubah
// (seperti slicer di Power BI).

import { useMemo, useState } from 'react';
import { LevelBadge } from '../components/Badges.jsx';
import ChartCard, { Legend } from '../components/ChartCard.jsx';
import { HorizontalBarChart, StackedBarChart, TrendLineChart } from '../components/Charts.jsx';
import Heatmap from '../components/Heatmap.jsx';
import KpiCard from '../components/KpiCard.jsx';
import Modal from '../components/Modal.jsx';
import WorkOrderTable from '../components/WorkOrderTable.jsx';
import { useData } from '../context/DataContext.jsx';
import { STATUSES, WO_TYPES } from '../data/catalog.js';
import {
  STATUS_ORDER,
  breakdownTrend,
  componentPareto,
  delayAnalysis,
  downtimeByType,
  downtimeHeatmap,
  downtimeSplit,
  heatmapCellWorkOrders,
  paByUnit,
  repairBreakdown,
  statusSummary,
  typeSummary,
} from '../lib/analytics.js';
import { formatDateMs, formatHours, formatNumber, formatPercent, formatRupiahCompact } from '../lib/format.js';
import { DAY, TARGETS, buildBuckets, calcKpi, kpiSeries, periodFromDates } from '../lib/kpi.js';
import { formatDate } from '../data/simulate.js';
import { useChartColors } from '../lib/useChartColors.js';
import PageHeader from '../components/PageHeader.jsx';
import TableWrap from '../components/TableWrap.jsx';

const percentTick = (v) => `${v}%`;
const hoursValue = (v) => `${formatNumber(v)} jam`;
const STATUS_COLOR_KEY = { Completed: 'good', 'In Progress': 'warning', 'Waiting Part': 'serious', Open: 'critical' };

export default function Dashboard() {
  const { units: siteUnits, workOrders, hmIndex, refTime, openUnit } = useData();
  const colors = useChartColors();

  const defaultFrom = useMemo(() => {
    const first = workOrders.reduce((min, wo) => (wo.start < min ? wo.start : min), '9999');
    return first === '9999' ? formatDate(refTime - 30 * DAY) : first.slice(0, 10);
  }, [workOrders, refTime]);
  const [filters, setFilters] = useState({ fromDate: defaultFrom, toDate: formatDate(refTime - DAY), unitType: '', unitCode: '' });
  const [drill, setDrill] = useState(null);

  const setFilter = (key, value) =>
    setFilters((f) => ({ ...f, [key]: value, ...(key === 'unitType' ? { unitCode: '' } : {}) }));

  const unitTypes = [...new Set(siteUnits.map((u) => u.type))].sort();
  const unitsOfType = siteUnits.filter((u) => !filters.unitType || u.type === filters.unitType);
  const units = useMemo(
    () => siteUnits.filter((u) => (!filters.unitType || u.type === filters.unitType) && (!filters.unitCode || u.code === filters.unitCode)),
    [siteUnits, filters.unitType, filters.unitCode],
  );
  const valid = filters.fromDate && filters.toDate && filters.fromDate <= filters.toDate;

  const r = useMemo(() => {
    if (!valid || units.length === 0) return null;
    const { from, to } = periodFromDates(filters.fromDate, filters.toDate);
    const args = { units, workOrders, hmIndex, from, to };
    const days = (to - from) / DAY;
    const allBuckets = buildBuckets(from, to);
    // Periode terakhir yang tidak lengkap (mis. minggu yang baru 1 hari) disembunyikan dari grafik tren
    // supaya tidak terlihat seperti penurunan drastis
    const trendBuckets = allBuckets.length > 2 && allBuckets.at(-1).partial ? allBuckets.slice(0, -1) : allBuckets;
    const sparkBuckets = buildBuckets(from, to, days > 120 ? 'month' : days > 21 ? 'week' : 'day');
    const heatBuckets = allBuckets;
    return {
      from,
      to,
      kpi: calcKpi(args),
      spark: kpiSeries({ units, workOrders, hmIndex, buckets: sparkBuckets }),
      trend: breakdownTrend({ units, workOrders, buckets: trendBuckets }),
      granularity: trendBuckets[0]?.granularity,
      status: statusSummary(args),
      split: downtimeSplit(args),
      delay: delayAnalysis(args),
      byType: downtimeByType(args),
      heatBuckets,
      heat: downtimeHeatmap({ units, workOrders, buckets: heatBuckets }),
      types: typeSummary(args),
      paUnits: paByUnit(args).slice(0, 12),
      pareto: componentPareto(args),
      repair: repairBreakdown(args),
    };
  }, [valid, units, workOrders, hmIndex, filters.fromDate, filters.toDate]);

  const perLabel = { day: 'per hari', week: 'per minggu', month: 'per bulan' };

  return (
    <div className="page">
      <PageHeader step={3} title="Dashboard KPI">
        Semua angka dihitung otomatis dari work order dan hour meter. Warna merah menandai masalah terbesar. Klik batang, sel heatmap,
        atau kode unit untuk melihat detailnya.
      </PageHeader>

      <div className="card filters" role="group" aria-label="Filter dashboard">
        <label>
          Dari tanggal
          <input type="date" value={filters.fromDate} onChange={(e) => setFilter('fromDate', e.target.value)} />
        </label>
        <label>
          Sampai tanggal
          <input type="date" value={filters.toDate} onChange={(e) => setFilter('toDate', e.target.value)} />
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
        <div className="filters-action">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setFilters({ fromDate: defaultFrom, toDate: formatDate(refTime - DAY), unitType: '', unitCode: '' })}
          >
            Reset filter
          </button>
        </div>
      </div>

      {!valid && <p className="alert">Tanggal awal harus sama dengan atau sebelum tanggal akhir.</p>}
      {valid && units.length === 0 && <p className="alert alert-info">Tidak ada unit untuk filter ini.</p>}

      {r && (
        <>
          <div className="kpi-grid">
            <KpiCard
              kpiKey="breakdownCount"
              label="B/D events"
              description="Jumlah kejadian unit rusak mendadak (tak terjadwal)"
              value={r.kpi.breakdownCount}
              display={formatNumber(r.kpi.breakdownCount)}
              note={`${formatNumber(r.kpi.unscheduledDowntime)} jam down`}
              series={r.spark}
              color={colors.series1}
            />
            <KpiCard
              kpiKey="mtbf"
              label="MTBF"
              description="Rata-rata jam kerja sebelum unit rusak"
              value={r.kpi.mtbf}
              display={formatHours(r.kpi.mtbf)}
              series={r.spark}
              color={colors.series1}
            />
            <KpiCard
              kpiKey="mttr"
              label="MTTR"
              description="Rata-rata lama perbaikan saat rusak"
              value={r.kpi.mttr}
              display={formatHours(r.kpi.mttr)}
              series={r.spark}
              color={colors.series1}
            />
            <KpiCard
              kpiKey="pa"
              label="PA"
              description="Physical Availability — % waktu unit siap pakai"
              value={r.kpi.pa}
              display={formatPercent(r.kpi.pa)}
              series={r.spark}
              color={colors.series1}
            />
            <KpiCard
              kpiKey="ma"
              label="MA"
              description="Mechanical Availability — jam kerja dibanding jam kerja + perbaikan"
              value={r.kpi.ma}
              display={formatPercent(r.kpi.ma)}
              series={r.spark}
              color={colors.series1}
            />
            <KpiCard
              kpiKey="ua"
              label="UA"
              description="Use of Availability — % waktu siap pakai yang dipakai bekerja"
              value={r.kpi.ua}
              display={formatPercent(r.kpi.ua)}
              series={r.spark}
              color={colors.series1}
            />
          </div>

          <div className="grid-main-side">
            <ChartCard
              title="Tren frekuensi breakdown"
              subtitle={`Jumlah WO ${perLabel[r.granularity]}, tak terjadwal vs terjadwal`}
              legend={
                <Legend
                  items={[
                    { label: 'Tak terjadwal (BM + BAC)', color: colors.series1 },
                    { label: 'Terjadwal (PM + CM)', color: colors.series2 },
                  ]}
                />
              }
              rows={r.trend}
              columns={[
                { label: 'Periode', render: (x) => x.name },
                { label: 'Tak terjadwal', numeric: true, render: (x) => x.unscheduled },
                { label: 'Terjadwal', numeric: true, render: (x) => x.scheduled },
              ]}
            >
              <TrendLineChart
                data={r.trend}
                series={[
                  { key: 'unscheduled', name: 'Tak terjadwal', short: 'Tak terjadwal', color: colors.series1 },
                  { key: 'scheduled', name: 'Terjadwal', short: 'Terjadwal', color: colors.series2 },
                ]}
                formatValue={(v) => `${formatNumber(v)} WO`}
                formatTick={(v) => formatNumber(v)}
                height={230}
              />
            </ChartCard>

            <ChartCard title="Status work order" subtitle="WO dalam periode + WO belum selesai">
              <div className="status-list">
                {STATUS_ORDER.map((name) => {
                  const row = r.status.find((s) => s.name === name);
                  const max = Math.max(1, ...r.status.map((s) => s.value));
                  return (
                    <div className="status-item" key={name} title={STATUSES[name].hint}>
                      <span>
                        <b>{name}</b>
                        <br />
                        <span className="muted small">{STATUSES[name].hint}</span>
                      </span>
                      <div className="status-track">
                        <div className="status-fill" style={{ width: `${(row.value / max) * 100}%`, background: colors[STATUS_COLOR_KEY[name]] }} />
                      </div>
                      <span className="num">{formatNumber(row.value)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="muted small" style={{ marginTop: 12 }}>
                Backlog (belum selesai): <b>{formatNumber(r.kpi.backlog)}</b> WO · Biaya periode: <b>{formatRupiahCompact(r.kpi.cost)}</b>
              </p>
            </ChartCard>
          </div>

          <RepairSection repair={r.repair} mttr={r.kpi.mttr} colors={colors} />

          <div className="grid-3">
            <ChartCard title="Distribusi downtime" subtitle="Terjadwal (planned) vs tak terjadwal (unplanned)">
              <div className="split-bar" aria-hidden="true">
                <div style={{ flex: r.split.planned, background: colors.series2 }} />
                <div style={{ flex: r.split.unplanned, background: colors.series1 }} />
              </div>
              <div className="split-rows">
                {[
                  ['Terjadwal (PM + CM)', r.split.planned, colors.series2],
                  ['Tak terjadwal (BM + BAC)', r.split.unplanned, colors.series1],
                ].map(([label, value, color]) => (
                  <div className="split-row" key={label}>
                    <span className="legend-item">
                      <span className="legend-swatch" style={{ background: color, height: 10 }} />
                      {label}
                    </span>
                    <span className="num">
                      {formatNumber(value)} jam · {formatPercent(r.split.total ? (value / r.split.total) * 100 : null)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="muted small" style={{ marginTop: 10 }}>
                Makin besar porsi terjadwal, makin baik: kerusakan dicegah lewat PM, bukan diperbaiki setelah rusak.
              </p>
            </ChartCard>

            <ChartCard
              title="Analisis delay"
              subtitle="Penyebab perbaikan tertunda — total jam & berapa kali"
              rows={r.delay}
              columns={[
                { label: 'Alasan', render: (x) => x.name },
                { label: 'Jam', numeric: true, render: (x) => formatNumber(x.value) },
                { label: 'Frekuensi', numeric: true, render: (x) => `${x.count}×` },
              ]}
            >
              {r.delay.length ? (
                <HorizontalBarChart
                  data={r.delay}
                  formatValue={(v, row) => `${formatNumber(v)} jam${row ? ` · ${row.count}×` : ''}`}
                  formatTick={(v) => formatNumber(v)}
                  labelWidth={124}
                  highlight="max"
                />
              ) : (
                <p className="muted small">Data delay tidak tersedia (dataset Site A tidak mencatat alasan delay).</p>
              )}
            </ChartCard>

            <ChartCard
              title="Downtime per jenis WO"
              subtitle="Total jam down"
              rows={r.byType}
              columns={[
                { label: 'Jenis', render: (x) => `${x.name} · ${WO_TYPES[x.name]?.label}` },
                { label: 'Jam', numeric: true, render: (x) => formatNumber(x.value) },
                { label: 'Jumlah WO', numeric: true, render: (x) => x.count },
              ]}
            >
              <HorizontalBarChart data={r.byType} formatValue={hoursValue} formatTick={(v) => formatNumber(v)} labelWidth={44} highlight="max" />
              <p className="muted small">PM = servis berkala · CM = perbaikan terencana · BM = rusak mendadak · BAC = rusak karena insiden</p>
            </ChartCard>
          </div>

          <ChartCard
            title="Heatmap ketersediaan armada"
            subtitle={`Rata-rata jam down per unit, ${perLabel[r.heatBuckets[0]?.granularity]} — klik sel untuk melihat WO penyebabnya`}
          >
            <Heatmap
              rows={r.heat.rows}
              buckets={r.heatBuckets}
              max={r.heat.max}
              onSelect={(rowName, bucket) =>
                setDrill({ rowName, bucket, items: heatmapCellWorkOrders({ units, workOrders, rowName, bucket }) })
              }
            />
          </ChartCard>

          <ChartCard title="Ringkasan per tipe unit" subtitle={`Diurutkan dari downtime terbesar · ✓ / ✕ = PA sesuai / di bawah target ${TARGETS.pa.value}%`}>
            <TableWrap label="Tabel ringkasan per tipe unit">
              <table>
                <thead>
                  <tr>
                    <th>Tipe unit</th>
                    <th className="num">Unit</th>
                    <th className="num">B/D</th>
                    <th className="num">Jam operasi</th>
                    <th className="num">Downtime</th>
                    <th className="num">PA</th>
                    <th className="num">MA</th>
                    <th className="num">UA</th>
                    <th className="num">MTBF</th>
                    <th className="num">Biaya</th>
                  </tr>
                </thead>
                <tbody>
                  {r.types.map((t, i) => (
                    <tr key={t.name}>
                      <td>
                        <button type="button" className="link-button" onClick={() => setFilter('unitType', t.name)}>
                          {t.name}
                        </button>
                        {i === 0 && r.types.length > 1 && (
                          <>
                            {' '}
                            <LevelBadge level="critical">Downtime tertinggi</LevelBadge>
                          </>
                        )}
                      </td>
                      <td className="num">{t.unitCount}</td>
                      <td className="num">{formatNumber(t.breakdownCount)}</td>
                      <td className="num">{formatNumber(t.operatingHours)}</td>
                      <td className="num">{formatNumber(t.downtimeHours)}</td>
                      <td className={`num nowrap ${t.pa >= TARGETS.pa.value ? 'status-good' : 'status-critical'}`}>
                        <span aria-hidden="true">{t.pa >= TARGETS.pa.value ? '✓ ' : '✕ '}</span>
                        {formatPercent(t.pa)}
                      </td>
                      <td className="num">{formatPercent(t.ma)}</td>
                      <td className="num">{formatPercent(t.ua)}</td>
                      <td className="num">{formatHours(t.mtbf)}</td>
                      <td className="num nowrap">{formatRupiahCompact(t.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </ChartCard>

          <div className="grid-2">
            <ChartCard
              title="PA terendah per unit"
              subtitle={`12 unit dengan PA terendah · target ${TARGETS.pa.value}% · klik batang untuk detail unit`}
              rows={r.paUnits}
              columns={[
                { label: 'Unit', render: (x) => x.name },
                { label: 'PA', numeric: true, render: (x) => formatPercent(x.value) },
              ]}
            >
              <HorizontalBarChart
                data={r.paUnits}
                formatValue={formatPercent}
                formatTick={percentTick}
                domainMax={100}
                target={TARGETS.pa.value}
                targetLabel={`Target ${TARGETS.pa.value}%`}
                labelWidth={64}
                onSelect={openUnit}
                highlight="min"
              />
            </ChartCard>

            <ChartCard
              title="Pareto komponen breakdown"
              subtitle="Jam down breakdown tak terjadwal per komponen"
              rows={r.pareto}
              columns={[
                { label: 'Komponen', render: (x) => x.name },
                { label: 'Jam', numeric: true, render: (x) => formatNumber(x.value) },
                { label: 'Kejadian', numeric: true, render: (x) => x.count },
              ]}
            >
              {r.pareto.length ? (
                <HorizontalBarChart data={r.pareto} formatValue={hoursValue} formatTick={(v) => formatNumber(v)} highlight="max" />
              ) : (
                <p className="muted small">Data komponen tidak tersedia (dataset Site A tidak mencatat komponen).</p>
              )}
            </ChartCard>
          </div>

          <p className="muted small">
            Periode {formatDateMs(r.from)} – {formatDateMs(r.to - DAY)} · {units.length} unit · {formatNumber(r.kpi.woCount)} WO ·{' '}
            {formatNumber(r.kpi.operatingHours)} jam operasi (dari hour meter)
          </p>
        </>
      )}

      {drill && (
        <Modal title={`${drill.rowName} · ${drill.bucket.label}`} onClose={() => setDrill(null)} width="min(1000px, 100%)">
          <p className="muted small">{drill.items.length} WO menyebabkan downtime di sel ini.</p>
          <WorkOrderTable workOrders={drill.items} />
        </Modal>
      )}
    </div>
  );
}

// Rincian MTTR: respon → menunggu → pengerjaan, per tipe unit
const REPAIR_PARTS = [
  { key: 'response', name: 'Respon mekanik', hint: 'unit rusak → mekanik mulai', color: 'series1' },
  { key: 'waiting', name: 'Menunggu', hint: 'part, tools, cuaca, dll.', color: 'series2' },
  { key: 'wrench', name: 'Pengerjaan', hint: 'jam kerja perbaikan', color: 'series3' },
];

function RepairSection({ repair, mttr, colors }) {
  const o = repair.overall;
  const series = REPAIR_PARTS.map((p) => ({ key: p.key, name: p.name, color: colors[p.color] }));
  const biggest = o.count ? [...REPAIR_PARTS].sort((a, b) => o[b.key] - o[a.key])[0] : null;
  const hours = (v) => `${formatNumber(v, 1)} jam`;

  return (
    <div className="grid-main-side">
      <ChartCard
        title="Rincian waktu perbaikan per tipe unit"
        subtitle="Rata-rata jam per breakdown, dipecah menjadi respon, menunggu, dan pengerjaan"
        legend={<Legend items={series.map((s) => ({ label: s.name, color: s.color }))} shape="box" />}
        rows={repair.byType}
        columns={[
          { label: 'Tipe unit', render: (x) => x.name },
          { label: 'Respon', numeric: true, render: (x) => hours(x.response) },
          { label: 'Menunggu', numeric: true, render: (x) => hours(x.waiting) },
          { label: 'Pengerjaan', numeric: true, render: (x) => hours(x.wrench) },
          { label: 'Total', numeric: true, render: (x) => hours(x.total) },
          { label: 'Jumlah BD', numeric: true, render: (x) => x.count },
        ]}
      >
        {repair.byType.length ? (
          <StackedBarChart data={repair.byType} series={series} formatValue={hours} formatTick={(v) => formatNumber(v)} labelWidth={104} />
        ) : (
          <p className="muted small">Belum ada breakdown dengan waktu respon tercatat pada filter ini.</p>
        )}
      </ChartCard>

      <ChartCard title="Ke mana waktu perbaikan habis?" subtitle={`Rata-rata ${o.count} breakdown selesai · MTTR ${formatNumber(mttr, 1)} jam`}>
        {o.count ? (
          <>
            <div className="split-bar" aria-hidden="true">
              {REPAIR_PARTS.map((p) => (
                <div key={p.key} style={{ flex: o[p.key], background: colors[p.color] }} />
              ))}
            </div>
            <div className="split-rows">
              {REPAIR_PARTS.map((p) => (
                <div className="split-row" key={p.key}>
                  <span className="legend-item">
                    <span className="legend-swatch" style={{ background: colors[p.color], height: 10 }} />
                    <span>
                      {p.name} <span className="muted small">· {p.hint}</span>
                    </span>
                  </span>
                  <span className="num">
                    {hours(o[p.key])} · {formatPercent(o.total ? (o[p.key] / o.total) * 100 : null)}
                  </span>
                </div>
              ))}
            </div>
            <p className="chart-note">
              <span className="chart-note-swatch" style={{ background: colors.critical }} aria-hidden="true" />
              <span>
                <b>Porsi terbesar: {biggest.name.toLowerCase()}</b> ({formatPercent((o[biggest.key] / o.total) * 100)}).{' '}
                {biggest.key === 'waiting'
                  ? 'Percepat pengadaan part & stok part kritis untuk menurunkan MTTR.'
                  : biggest.key === 'response'
                    ? 'Tambah mekanik standby, terutama shift malam.'
                    : 'Fokus pada keterampilan mekanik & prosedur perbaikan.'}
              </span>
            </p>
          </>
        ) : (
          <p className="muted small">Belum ada data waktu respon pada filter ini.</p>
        )}
        {repair.missing > 0 && (
          <p className="muted small" style={{ marginTop: 8 }}>
            {repair.missing} breakdown tidak mencatat waktu respon (mis. data Site A) dan tidak ikut dihitung di sini.
          </p>
        )}
      </ChartCard>
    </div>
  );
}
