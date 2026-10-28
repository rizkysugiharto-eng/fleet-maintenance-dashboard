// Perencanaan PM berbasis HM: kapan unit jatuh tempo servis berikutnya,
// dan seberapa disiplin PM dikerjakan tepat waktu (PM compliance).

import { useMemo, useState } from 'react';
import { LevelBadge } from '../components/Badges.jsx';
import { useData } from '../context/DataContext.jsx';
import { formatDateMs, formatNumber, formatPercent } from '../lib/format.js';
import { DAY } from '../lib/kpi.js';
import { PM_STATUS_LEVEL, PM_TOLERANCE, pmCompletionRate, pmCompliance, pmForecast } from '../lib/planning.js';
import PageHeader from '../components/PageHeader.jsx';
import TableWrap from '../components/TableWrap.jsx';

export default function PmPlanning() {
  const { units, workOrders, data, hmIndex, refTime, openUnit } = useData();
  const [statusFilter, setStatusFilter] = useState('');

  const forecast = useMemo(() => pmForecast({ units, pmLogs: data.pmLogs, hmIndex, refTime }), [units, data.pmLogs, hmIndex, refTime]);
  const compliance = useMemo(() => pmCompliance({ units, pmLogs: data.pmLogs }), [units, data.pmLogs]);
  const completion = useMemo(() => pmCompletionRate(workOrders), [workOrders]);

  const shown = forecast.filter((f) => !statusFilter || f.status === statusFilter);
  const count = (s) => forecast.filter((f) => f.status === s).length;

  return (
    <div className="page">
      <PageHeader step={3} title="Perencanaan PM">
        Kapan setiap unit perlu servis berikutnya. HM jatuh tempo = HM jadwal PM terakhir + interval; estimasi hari = sisa HM ÷ rata-rata
        HM per hari (data s.d. {formatDateMs(refTime - DAY)}).
      </PageHeader>

      <div className="kpi-grid">
        <div className="card kpi-card">
          <span className="kpi-label">PM SCHEDULE COMPLIANCE</span>
          <span className="kpi-desc">PM dikerjakan dalam toleransi ±{PM_TOLERANCE * 100}% interval HM</span>
          <span className="kpi-value">{formatPercent(compliance.compliance)}</span>
          <span className="kpi-meta">
            {compliance.compliant} dari {compliance.total} PM tepat waktu
          </span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-label">PM COMPLETION RATE</span>
          <span className="kpi-desc">% WO PM yang sudah selesai</span>
          <span className="kpi-value">{formatPercent(completion)}</span>
          <span className="kpi-meta">Selesai belum tentu tepat waktu</span>
        </div>
        {['Terlambat', 'Jatuh tempo', 'Minggu ini', 'Minggu depan'].map((s) => (
          <button
            key={s}
            type="button"
            className="card kpi-card"
            style={{ textAlign: 'left', color: 'inherit', cursor: 'pointer' }}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            aria-pressed={statusFilter === s}
          >
            <span className="kpi-label">{s.toUpperCase()}</span>
            <span className="kpi-desc">Klik untuk menyaring tabel</span>
            <span className="kpi-value">{count(s)}</span>
            <LevelBadge level={PM_STATUS_LEVEL[s]}>{s}</LevelBadge>
          </button>
        ))}
      </div>

      <section className="card card-pad">
        <header className="card-header">
          <div>
            <h2>Forecast PM per unit</h2>
            <p className="muted">Diurutkan dari sisa HM paling sedikit{statusFilter && ` · filter: ${statusFilter}`}</p>
          </div>
          {statusFilter && (
            <button type="button" className="btn-ghost btn-small" onClick={() => setStatusFilter('')}>
              Hapus filter
            </button>
          )}
        </header>
        <TableWrap label="Tabel forecast PM per unit">
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Tipe</th>
                <th className="num">HM saat ini</th>
                <th>PM berikutnya</th>
                <th className="num">HM jatuh tempo</th>
                <th className="num">Sisa HM</th>
                <th className="num">EWH</th>
                <th className="num">Estimasi hari</th>
                <th>Estimasi tanggal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((f) => (
                <tr key={f.unit.code}>
                  <td>
                    <button type="button" className="link-button" onClick={() => openUnit(f.unit.code)}>
                      {f.unit.code}
                    </button>
                  </td>
                  <td>{f.unit.type}</td>
                  <td className="num">{formatNumber(f.hm)}</td>
                  <td>
                    <span className="tag">{f.pmType}</span>
                  </td>
                  <td className="num">{formatNumber(f.due)}</td>
                  <td className="num">{formatNumber(f.remaining)}</td>
                  <td className="num">{formatNumber(f.ewh, 1)}</td>
                  <td className="num">{formatNumber(f.days, 1)}</td>
                  <td className="nowrap">{formatDateMs(f.estDate)}</td>
                  <td>
                    <LevelBadge level={PM_STATUS_LEVEL[f.status]}>{f.status}</LevelBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </section>

      <section className="card card-pad">
        <header className="card-header">
          <div>
            <h2>Log eksekusi PM</h2>
            <p className="muted">HM jadwal vs HM aktual saat PM dikerjakan · deviasi positif = terlambat · urut per unit, terbaru di atas</p>
          </div>
        </header>
        <TableWrap label="Tabel log eksekusi PM" style={{ maxHeight: 420 }}>
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Jenis PM</th>
                <th className="num">HM jadwal</th>
                <th className="num">HM aktual</th>
                <th className="num">Deviasi</th>
                <th>Tepat waktu?</th>
              </tr>
            </thead>
            <tbody>
              {[...compliance.rows]
                .sort((a, b) => a.unitCode.localeCompare(b.unitCode) || b.hmPlan - a.hmPlan)
                .map((r, i) => (
                <tr key={`${r.unitCode}-${r.hmPlan}-${i}`}>
                  <td className="mono">{r.unitCode}</td>
                  <td>
                    <span className="tag">{r.pmType}</span>
                  </td>
                  <td className="num">{formatNumber(r.hmPlan)}</td>
                  <td className="num">{formatNumber(r.hmActual)}</td>
                  <td className="num">
                    {r.deviation > 0 ? '+' : ''}
                    {formatNumber(r.deviation)} ({formatPercent(r.deviationPct * 100)})
                  </td>
                  <td>{r.inTolerance ? <LevelBadge level="good">Ya</LevelBadge> : <LevelBadge level="critical">Tidak</LevelBadge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </section>
    </div>
  );
}
