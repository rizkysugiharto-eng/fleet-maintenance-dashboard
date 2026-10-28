// Laporan Mingguan: satu halaman A4 siap cetak / simpan PDF untuk rapat mingguan.
// Isi: kesimpulan otomatis, KPI minggu ini vs minggu lalu, unit terburuk,
// komponen penyebab breakdown, rincian waktu perbaikan, backlog, dan rencana PM.

import { useMemo, useState } from 'react';
import { LevelBadge } from '../components/Badges.jsx';
import { HorizontalBarChart } from '../components/Charts.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useData } from '../context/DataContext.jsx';
import { SITES } from '../data/catalog.js';
import { formatDateMs, formatHours, formatNumber, formatPercent, formatRupiahCompact } from '../lib/format.js';
import { DAY, TARGETS, meetsTarget } from '../lib/kpi.js';
import { PM_STATUS_LEVEL } from '../lib/planning.js';
import { listWeeks, weeklyReport } from '../lib/report.js';
import { useChartColors } from '../lib/useChartColors.js';
import TableWrap from '../components/TableWrap.jsx';

const PM_ROWS = 8; // baris PM yang dicetak (paling mendesak dulu)

// Baris tabel KPI: arah "lebih baik" menentukan warna panah perubahan
const KPI_ROWS = [
  { key: 'pa', label: 'PA · ketersediaan unit', format: formatPercent, better: 'up', points: true },
  { key: 'ma', label: 'MA · ketersediaan mekanis', format: formatPercent, better: 'up', points: true },
  { key: 'ua', label: 'UA · pemakaian unit', format: formatPercent, better: 'up', points: true },
  { key: 'mtbf', label: 'MTBF · jam kerja sebelum rusak', format: formatHours, better: 'up' },
  { key: 'mttr', label: 'MTTR · lama perbaikan', format: formatHours, better: 'down' },
  { key: 'breakdownCount', label: 'Jumlah breakdown', format: (v) => formatNumber(v), better: 'down' },
  { key: 'downtimeHours', label: 'Total downtime', format: (v) => `${formatNumber(v)} jam`, better: 'down' },
  { key: 'cost', label: 'Biaya maintenance', format: formatRupiahCompact, better: 'down' },
];

function Change({ row, now, before }) {
  if (now == null || before == null) return <span className="muted">–</span>;
  const diff = now - before;
  if (Math.abs(diff) < 1e-9) return <span className="muted">tetap</span>;
  const good = row.better === 'up' ? diff > 0 : diff < 0;
  const text = row.points
    ? `${formatNumber(Math.abs(diff), 1)} poin`
    : before
      ? formatPercent((Math.abs(diff) / Math.abs(before)) * 100)
      : '–';
  return (
    <span className={`status ${good ? 'status-good' : 'status-critical'}`}>
      <span aria-hidden="true">{diff > 0 ? '▲' : '▼'}</span> {diff > 0 ? 'naik' : 'turun'} {text}
    </span>
  );
}

export default function Report() {
  const { units, workOrders, data, hmIndex, refTime, prefs, openUnit } = useData();
  const colors = useChartColors();

  const weeks = useMemo(() => {
    const first = workOrders.reduce((min, wo) => (wo.start < min ? wo.start : min), '9999');
    const from = first === '9999' ? refTime - 60 * DAY : new Date(first).getTime();
    return listWeeks(from, refTime);
  }, [workOrders, refTime]);
  const [selected, setSelected] = useState(0);
  const week = weeks[Math.min(selected, weeks.length - 1)];

  const rep = useMemo(
    () => week && weeklyReport({ units, workOrders, pmLogs: data.pmLogs, hmIndex, start: week.start, end: week.end, refTime }),
    [week, units, workOrders, data.pmLogs, hmIndex, refTime],
  );

  const siteName = prefs.site === 'all' ? 'Semua site' : SITES.find((s) => s.id === prefs.site)?.name;
  const r = rep?.repair.overall;

  return (
    <div className="page">
      <PageHeader
        step={3}
        title="Laporan Mingguan"
        actions={
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(Number(e.target.value))}
              aria-label="Pilih minggu"
              disabled={!weeks.length}
            >
              {weeks.map((w, i) => (
                <option key={w.start} value={i}>
                  Minggu {w.week} · {formatDateMs(w.start)} – {formatDateMs(w.end - DAY)}
                </option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={() => window.print()} disabled={!rep}>
              <Icon name="download" size={15} /> Cetak / simpan PDF
            </button>
          </>
        }
      >
        Ringkasan satu halaman untuk rapat mingguan. Pilih minggu, lalu klik <b>Cetak / simpan PDF</b> dan pilih &quot;Save as PDF&quot; di
        jendela cetak.
      </PageHeader>

      {!rep && <p className="alert alert-info">Belum ada minggu lengkap di data ini.</p>}

      {rep && (
        <article className="card report">
          <header className="report-head">
            <span className="brand-mark" aria-hidden="true">
              F
            </span>
            <div>
              <h2 className="report-title">Laporan Mingguan Maintenance</h2>
              <p className="muted">
                Minggu {week.week} / {week.year} · {formatDateMs(week.start)} – {formatDateMs(week.end - DAY)} · {siteName} · {units.length}{' '}
                unit
              </p>
            </div>
            <span className="report-date muted small">Dibuat {formatDateMs(Date.now())}</span>
          </header>

          <section className="report-section">
            <h3>1. Ringkasan minggu ini</h3>
            <ul className="report-insights">
              {rep.insights.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>

          <section className="report-section">
            <h3>2. KPI minggu ini dibanding minggu lalu</h3>
            <TableWrap label="Tabel KPI minggu ini">
              <table>
                <thead>
                  <tr>
                    <th>KPI</th>
                    <th className="num">Minggu lalu</th>
                    <th className="num">Minggu ini</th>
                    <th>Perubahan</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {KPI_ROWS.map((row) => {
                    const t = TARGETS[row.key];
                    const ok = meetsTarget(row.key, rep.kpi[row.key]);
                    return (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td className="num">{row.format(rep.prev[row.key])}</td>
                        <td className="num">
                          <b>{row.format(rep.kpi[row.key])}</b>
                        </td>
                        <td className="nowrap">
                          <Change row={row} now={rep.kpi[row.key]} before={rep.prev[row.key]} />
                        </td>
                        <td className="nowrap">
                          {t ? (
                            <LevelBadge level={ok ? 'good' : 'critical'}>
                              {t.higherIsBetter ? '≥' : '≤'} {formatNumber(t.value)}
                              {t.unit === '%' ? '%' : ` ${t.unit}`}
                            </LevelBadge>
                          ) : (
                            <span className="muted">–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </section>

          <section className="report-section">
            <h3>3. Unit dengan downtime terlama</h3>
            <TableWrap label="Tabel unit dengan downtime terlama">
              <table>
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Tipe</th>
                    <th className="num">Down</th>
                    <th className="num">WO</th>
                    <th>Penyebab utama</th>
                  </tr>
                </thead>
                <tbody>
                  {rep.topUnits.map((u, i) => (
                    <tr key={u.unit.code}>
                      <td className="nowrap">
                        <button type="button" className="link-button" onClick={() => openUnit(u.unit.code)}>
                          {u.unit.code}
                        </button>
                        {i === 0 && (
                          <>
                            {' '}
                            <LevelBadge level="critical">Terlama</LevelBadge>
                          </>
                        )}
                      </td>
                      <td>{u.unit.type}</td>
                      <td className="num nowrap">{formatNumber(u.hours)} jam</td>
                      <td className="num">{u.woCount}</td>
                      <td>{u.main}</td>
                    </tr>
                  ))}
                  {rep.topUnits.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty">
                        Tidak ada downtime minggu ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </section>

          <div className="report-grid">
            <section className="report-section">
              <h3>4. Komponen penyebab breakdown</h3>
              {rep.pareto.length ? (
                <HorizontalBarChart
                  data={rep.pareto}
                  formatValue={(v) => `${formatNumber(v)} jam`}
                  formatTick={(v) => formatNumber(v)}
                  labelWidth={92}
                  highlight="max"
                />
              ) : (
                <p className="muted small">Tidak ada data komponen breakdown minggu ini.</p>
              )}
            </section>
            <section className="report-section">
              <h3>5. Waktu perbaikan breakdown</h3>
              {r.count ? (
                <>
                  <div className="split-bar" aria-hidden="true">
                    <div style={{ flex: r.response, background: colors.series1 }} />
                    <div style={{ flex: r.waiting, background: colors.series2 }} />
                    <div style={{ flex: r.wrench, background: colors.series3 }} />
                  </div>
                  <div className="split-rows">
                    {[
                      ['Respon mekanik', r.response, colors.series1],
                      ['Menunggu (part, tools, dll.)', r.waiting, colors.series2],
                      ['Pengerjaan', r.wrench, colors.series3],
                    ].map(([label, value, color]) => (
                      <div className="split-row" key={label}>
                        <span className="legend-item">
                          <span className="legend-swatch" style={{ background: color, height: 10 }} />
                          {label}
                        </span>
                        <span className="num">
                          {formatNumber(value, 1)} jam · {formatPercent((value / r.total) * 100)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="muted small" style={{ marginTop: 8 }}>
                    Rata-rata {r.count} breakdown selesai: {formatNumber(r.total, 1)} jam per kejadian.
                  </p>
                </>
              ) : (
                <p className="muted small">Tidak ada breakdown dengan waktu respon tercatat minggu ini.</p>
              )}
            </section>
          </div>

          <section className="report-section">
            <h3>6. Backlog</h3>
            <div className="report-stats">
              <div>
                <span className="report-stat">{rep.backlog.created}</span>
                <span className="muted small">WO baru</span>
              </div>
              <div>
                <span className="report-stat">{rep.backlog.closed}</span>
                <span className="muted small">WO selesai</span>
              </div>
              <div>
                <span className="report-stat">{rep.backlog.open}</span>
                <span className="muted small">masih terbuka</span>
              </div>
              <div>
                <span className="report-stat">{rep.backlog.old}</span>
                <span className="muted small">&gt; 90 hari</span>
              </div>
            </div>
          </section>
          <section className="report-section">
            <h3>7. Rencana PM 14 hari ke depan (paling mendesak)</h3>
            {!rep.isLatest ? (
              <p className="muted small">Rencana PM hanya ditampilkan untuk minggu terakhir (memakai HM terbaru).</p>
            ) : rep.pmNext.length ? (
              <>
                <TableWrap label="Tabel rencana PM 14 hari">
                  <table>
                    <thead>
                      <tr>
                        <th>Unit</th>
                        <th>Jenis PM</th>
                        <th className="num">HM jatuh tempo</th>
                        <th className="num">Sisa HM</th>
                        <th>Estimasi</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rep.pmNext.slice(0, PM_ROWS).map((f) => (
                        <tr key={f.unit.code}>
                          <td>{f.unit.code}</td>
                          <td>
                            <span className="tag">{f.pmType}</span>
                          </td>
                          <td className="num">{formatNumber(f.due)}</td>
                          <td className="num">{formatNumber(f.remaining)}</td>
                          <td className="nowrap">{formatDateMs(f.estDate)}</td>
                          <td>
                            <LevelBadge level={PM_STATUS_LEVEL[f.status]}>{f.status}</LevelBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
                {rep.pmNext.length > PM_ROWS && (
                  <p className="muted small">
                    +{rep.pmNext.length - PM_ROWS} unit lain jatuh tempo dalam 14 hari — lihat menu Perencanaan PM.
                  </p>
                )}
              </>
            ) : (
              <p className="muted small">Tidak ada PM jatuh tempo dalam 14 hari.</p>
            )}
          </section>

          <footer className="report-sign">
            <div>
              Disusun oleh,
              <span />
              Planner / Engineer
            </div>
            <div>
              Diperiksa oleh,
              <span />
              Plant Supervisor
            </div>
          </footer>
        </article>
      )}
    </div>
  );
}
