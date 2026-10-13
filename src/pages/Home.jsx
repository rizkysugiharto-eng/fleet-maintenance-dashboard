// Beranda: menjelaskan alur kerja aplikasi (catat → simpan → hitung → tindak lanjut)
// dan menampilkan hal-hal yang perlu ditindaklanjuti hari ini.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LevelBadge } from '../components/Badges.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useData } from '../context/DataContext.jsx';
import { isUnscheduled } from '../data/catalog.js';
import { componentPareto } from '../lib/analytics.js';
import { formatHours, formatNumber, formatPercent } from '../lib/format.js';
import { DAY, TARGETS, calcKpi, meetsTarget } from '../lib/kpi.js';
import { backlogItems, pmForecast } from '../lib/planning.js';

export default function Home() {
  const { units, workOrders, data, hmIndex, refTime, source, openUnit } = useData();

  const s = useMemo(() => {
    const from = refTime - 30 * DAY;
    const args = { units, workOrders, hmIndex, from, to: refTime };
    const down = workOrders.filter((wo) => !wo.end && isUnscheduled(wo.type));
    const pm = pmForecast({ units, pmLogs: data.pmLogs, hmIndex, refTime }).filter((f) => f.status === 'Terlambat' || f.status === 'Jatuh tempo');
    const backlog = backlogItems(workOrders, refTime);
    return {
      kpi: calcKpi(args),
      down,
      pm,
      backlog,
      oldBacklog: backlog.filter((b) => b.ageDays > 90),
      topComponent: componentPareto(args)[0],
      hmCount: data.hmLogs.filter((h) => units.some((u) => u.code === h.unitCode)).length,
    };
  }, [units, workOrders, data.pmLogs, data.hmLogs, hmIndex, refTime]);

  const steps = [
    {
      title: 'Catat',
      text: 'Planner/foreman mencatat work order dan hour meter setiap hari.',
      stat: `${formatNumber(workOrders.length)} WO`,
      sub: `${formatNumber(s.hmCount)} pembacaan HM`,
      to: '/input',
      cta: 'Input work order →',
    },
    {
      title: 'Periksa & simpan',
      text: 'Data dicek otomatis (format, urutan waktu, HM tidak turun) lalu disimpan.',
      stat: source.mode === 'database' ? 'Database' : 'Mode demo',
      sub: source.mode === 'database' ? 'Tersimpan di Supabase' : 'Tersimpan di browser ini',
      to: '/database',
      cta: 'Database & login →',
    },
    {
      title: 'Hitung otomatis',
      text: 'Sistem menghitung PA, MA, UA, MTBF, MTTR tanpa rumus manual.',
      stat: `PA ${formatPercent(s.kpi.pa)}`,
      sub: '30 hari terakhir',
      to: '/dashboard',
      cta: 'Dashboard KPI →',
    },
    {
      title: 'Tindak lanjut',
      text: 'Pantau unit rusak, backlog, dan jadwal PM untuk mengambil keputusan.',
      stat: `${formatNumber(s.backlog.length)} backlog`,
      sub: `${s.down.length} unit sedang breakdown`,
      to: '/backlog',
      cta: 'Lihat backlog →',
    },
  ];

  const kpiRows = [
    { key: 'pa', label: 'PA · ketersediaan unit', value: s.kpi.pa, text: formatPercent(s.kpi.pa) },
    { key: 'mtbf', label: 'MTBF · jam kerja sebelum rusak', value: s.kpi.mtbf, text: formatHours(s.kpi.mtbf) },
    { key: 'mttr', label: 'MTTR · lama perbaikan', value: s.kpi.mttr, text: formatHours(s.kpi.mttr) },
    { key: 'ma', label: 'MA · ketersediaan mekanis', value: s.kpi.ma, text: formatPercent(s.kpi.ma) },
  ];

  return (
    <div className="page">
      <PageHeader title="Beranda">
        Aplikasi ini mengikuti alur kerja maintenance alat berat. Ikuti langkah 1 → 4 di bawah, atau pakai menu di kiri yang disusun
        dengan urutan yang sama.
      </PageHeader>

      <div className="flow">
        {steps.map((step, i) => (
          <section key={step.title} className="card flow-step">
            <span className="flow-num">{i + 1}</span>
            <h2>{step.title}</h2>
            <p className="muted small">{step.text}</p>
            <span className="flow-stat">{step.stat}</span>
            <span className="muted small">{step.sub}</span>
            <Link to={step.to}>{step.cta}</Link>
          </section>
        ))}
      </div>

      <div className="grid-2">
        <section className="card card-pad">
          <header className="card-header">
            <div>
              <h2>Perlu perhatian</h2>
              <p className="muted">Hal yang sebaiknya ditindaklanjuti lebih dulu.</p>
            </div>
          </header>
          <ul className="attention-list">
            <li>
              <span>
                <b>{s.down.length} unit sedang breakdown</b>
                <br />
                <span className="muted small">
                  {s.down.slice(0, 6).map((wo, i) => (
                    <span key={wo.id}>
                      {i > 0 && ', '}
                      <button type="button" className="link-button" onClick={() => openUnit(wo.unitCode)}>
                        {wo.unitCode}
                      </button>
                    </span>
                  ))}
                  {s.down.length === 0 && 'Semua unit siap operasi'}
                </span>
              </span>
              <LevelBadge level={s.down.length ? 'critical' : 'good'}>{s.down.length ? 'Segera' : 'Aman'}</LevelBadge>
            </li>
            <li>
              <span>
                <b>{s.pm.length} unit PM terlambat / jatuh tempo</b>
                <br />
                <Link className="small" to="/pm">
                  Buka perencanaan PM
                </Link>
              </span>
              <LevelBadge level={s.pm.length ? 'serious' : 'good'}>{s.pm.length ? 'Jadwalkan' : 'Aman'}</LevelBadge>
            </li>
            <li>
              <span>
                <b>{s.oldBacklog.length} backlog berumur &gt; 90 hari</b>
                <br />
                <Link className="small" to="/backlog">
                  Buka backlog
                </Link>
              </span>
              <LevelBadge level={s.oldBacklog.length ? 'warning' : 'good'}>{s.oldBacklog.length ? 'Tinjau' : 'Aman'}</LevelBadge>
            </li>
            <li>
              <span>
                <b>Komponen penyebab downtime tertinggi (30 hari)</b>
                <br />
                <span className="muted small">
                  {s.topComponent ? `${s.topComponent.name} · ${formatNumber(s.topComponent.value)} jam · ${s.topComponent.count} kejadian` : 'Data komponen tidak tersedia'}
                </span>
              </span>
              {s.topComponent && <LevelBadge level="critical">Tertinggi</LevelBadge>}
            </li>
          </ul>
        </section>

        <section className="card card-pad">
          <header className="card-header">
            <div>
              <h2>Kondisi armada 30 hari terakhir</h2>
              <p className="muted">
                {units.length} unit · dibandingkan dengan target. <Link to="/dashboard">Detail di Dashboard KPI →</Link>
              </p>
            </div>
          </header>
          <ul className="attention-list">
            {kpiRows.map((k) => {
              const ok = meetsTarget(k.key, k.value);
              const t = TARGETS[k.key];
              return (
                <li key={k.key}>
                  <span>
                    <b>{k.text}</b>
                    <br />
                    <span className="muted small">
                      {k.label} · target {t.higherIsBetter ? '≥' : '≤'} {formatNumber(t.value)}
                      {t.unit === '%' ? '%' : ` ${t.unit}`}
                    </span>
                  </span>
                  {ok != null && <LevelBadge level={ok ? 'good' : 'critical'}>{ok ? 'Sesuai target' : 'Di bawah target'}</LevelBadge>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
