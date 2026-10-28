// Briefing Pagi (beranda): tiga hal yang dibahas di meeting pagi workshop —
// unit yang rusak, servis yang jatuh tempo, dan pekerjaan yang tertunda.
// Setiap baris unit membuka Detail unit; unit B/D bisa langsung ditindaklanjuti.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import UnitIllustration from '../components/UnitIllustration.jsx';
import { StatusTag, UnitPlate } from '../components/Workshop.jsx';
import { useData } from '../context/DataContext.jsx';
import { STATUSES } from '../data/catalog.js';
import { componentPareto } from '../lib/analytics.js';
import { formatDateMs, formatHours, formatNumber, formatPercent } from '../lib/format.js';
import { DAY, TARGETS, calcKpi, meetsTarget, toMs } from '../lib/kpi.js';
import { agingSummary, backlogItems, pmForecast, unitConditions } from '../lib/planning.js';

const KPI_DOC =
  'https://github.com/rizkysugiharto-eng/fleet-maintenance-dashboard/blob/main/docs/KPI.md#perbedaan-dengan-rumus-di-excelpower-bi-lama';
const LIST_LIMIT = 5;

const HOW_IT_WORKS = [
  { title: 'Catat', text: 'Planner/foreman mencatat work order dan hour meter setiap hari.', to: '/input', cta: 'Input work order' },
  { title: 'Periksa & simpan', text: 'Data dicek otomatis (format, urutan waktu, HM tidak turun) lalu disimpan.', to: '/database', cta: 'Database & login' },
  { title: 'Hitung otomatis', text: 'Sistem menghitung PA, MA, UA, MTBF, MTTR tanpa rumus manual.', to: '/dashboard', cta: 'Dashboard KPI' },
  { title: 'Tindak lanjut', text: 'Halaman ini: unit rusak, servis jatuh tempo, dan backlog untuk diputuskan hari ini.', to: '/backlog', cta: 'Backlog' },
];

// "3 hari" / "14 jam" sejak unit berhenti
function downSince(start, refTime) {
  const hours = Math.max(0, (refTime - toMs(start)) / 3600000);
  return hours >= 24 ? `${formatNumber(hours / 24)} hari` : `${formatNumber(hours)} jam`;
}

// Nilai awal untuk input datetime-local, mis. "2026-01-01T00:00"
function toInputValue(ms) {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

function FollowUp({ workOrder, unit, refTime, onDone }) {
  const { updateWorkOrderStatus, closeWorkOrder } = useData();
  const [status, setStatus] = useState(workOrder.status);
  const [end, setEnd] = useState(toInputValue(Math.max(refTime, toMs(workOrder.start) + 3600000)));
  const [error, setError] = useState('');
  const endInvalid = !end || toMs(end) <= toMs(workOrder.start);

  async function run(action) {
    try {
      setError('');
      await action();
      onDone();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Modal title={`Tindak lanjut ${workOrder.id}`} onClose={onDone} width="min(560px, 100%)">
      <div className="followup-unit">
        <UnitIllustration type={unit.type} width={72} />
        <UnitPlate code={unit.code} />
        <span className="small">
          <b>{workOrder.component ?? 'Breakdown'}</b>
          {workOrder.problem ? ` · ${workOrder.problem}` : ''}
          <br />
          <span className="muted">Mulai {formatDateMs(toMs(workOrder.start))} · berhenti {downSince(workOrder.start, refTime)}</span>
        </span>
      </div>

      <section className="followup-step" aria-labelledby="fu-status">
        <h3 id="fu-status">1 · Perbarui status pekerjaan</h3>
        <div className="followup-row">
          <label className="field">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.keys(STATUSES)
                .filter((s) => s !== 'Completed')
                .map((s) => (
                  <option key={s} value={s}>
                    {s} · {STATUSES[s].hint}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-ghost"
            disabled={status === workOrder.status}
            onClick={() => run(() => updateWorkOrderStatus(workOrder.id, status))}
          >
            Simpan status
          </button>
        </div>
      </section>

      <section className="followup-step" aria-labelledby="fu-close">
        <h3 id="fu-close">2 · Unit sudah RFU? Tutup WO</h3>
        <div className="followup-row">
          <label className="field">
            Waktu selesai
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-invalid={endInvalid || undefined}
              aria-describedby={endInvalid ? 'fu-end-error' : undefined}
            />
          </label>
          <button type="button" className="btn-primary" disabled={endInvalid} onClick={() => run(() => closeWorkOrder(workOrder.id, end))}>
            Tutup WO, unit RFU
          </button>
        </div>
        {endInvalid && (
          <span className="field-error" id="fu-end-error">
            Waktu selesai harus setelah waktu mulai.
          </span>
        )}
      </section>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

export default function Home() {
  const { units, workOrders, data, hmIndex, refTime, openUnit, unitByCode, canWrite, prefs } = useData();
  const [followUp, setFollowUp] = useState(null);

  const s = useMemo(() => {
    const args = { units, workOrders, hmIndex, from: refTime - 30 * DAY, to: refTime };
    const conditions = unitConditions({ units, workOrders, pmLogs: data.pmLogs, hmIndex, refTime });
    const down = conditions.filter((c) => c.level === 'critical').sort((a, b) => toMs(a.active.start) - toMs(b.active.start));
    const pmDue = pmForecast({ units, pmLogs: data.pmLogs, hmIndex, refTime }).filter(
      (f) => f.status === 'Terlambat' || f.status === 'Jatuh tempo',
    );
    const backlog = backlogItems(workOrders, refTime);
    const count = (level) => conditions.filter((c) => c.level === level).length;
    return {
      kpi: calcKpi(args),
      down,
      pmDue,
      backlog,
      aging: agingSummary(backlog),
      topComponent: componentPareto(args)[0],
      levels: { critical: count('critical'), warning: count('warning'), good: count('good') },
    };
  }, [units, workOrders, data.pmLogs, hmIndex, refTime]);

  const dataDay = refTime - DAY;
  const weekday = new Date(dataDay).toLocaleDateString('id-ID', { weekday: 'long' });
  const operable = units.length - s.levels.critical;
  const agingMax = Math.max(...s.aging.map((a) => a.value), 1);
  const agingWorst = s.aging.reduce((w, a) => (a.value > w.value ? a : w), s.aging[0]);

  const kpiRows = [
    { key: 'pa', label: 'PA · ketersediaan unit', value: s.kpi.pa, text: formatPercent(s.kpi.pa) },
    { key: 'mtbf', label: 'MTBF · jam sebelum rusak', value: s.kpi.mtbf, text: formatHours(s.kpi.mtbf) },
    { key: 'mttr', label: 'MTTR · lama perbaikan', value: s.kpi.mttr, text: formatHours(s.kpi.mttr) },
    { key: 'ma', label: 'MA · ketersediaan mekanis', value: s.kpi.ma, text: formatPercent(s.kpi.ma) },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${weekday}, ${formatDateMs(dataDay)} · ${units.length} unit · ${prefs.site === 'all' ? 'semua site' : `Site ${prefs.site}`}`}
        title="Briefing Pagi"
        actions={
          <Link to="/input" className="btn-primary btn-link">
            + Catat work order
          </Link>
        }
      >
        Tiga hal yang dibahas di meeting pagi: unit yang rusak, servis yang jatuh tempo, dan pekerjaan yang tertunda.
      </PageHeader>

      <details className="howto card">
        <summary>
          <span className="howto-title">Baru pertama kali? Lihat cara kerja aplikasi ini</span>
          <span className="muted small">4 langkah, dari catat data sampai tindak lanjut</span>
        </summary>
        <ol className="howto-steps">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title}>
              <span className="step-dot" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <b>{step.title}</b>
                <br />
                <span className="muted small">{step.text}</span>
                <br />
                <Link to={step.to} className="small">
                  {step.cta} →
                </Link>
              </span>
            </li>
          ))}
        </ol>
      </details>

      <section className="fleet-strip card card-pad" aria-labelledby="fleet-title">
        <div className="fleet-strip-head">
          <h2 id="fleet-title">
            <span className="fleet-big">{operable}</span> dari {units.length} unit bisa beroperasi
          </h2>
          <Link to="/health" className="small">
            Lihat semua unit →
          </Link>
        </div>
        <div className="fleet-bar" aria-hidden="true">
          {['good', 'warning', 'critical'].map((level) =>
            s.levels[level] ? <span key={level} className={`edge-${level}`} style={{ flexGrow: s.levels[level] }} /> : null,
          )}
        </div>
        <p className="fleet-legend">
          <StatusTag level="good" /> {s.levels.good} unit <StatusTag level="warning" /> {s.levels.warning} unit{' '}
          <StatusTag level="critical" /> {s.levels.critical} unit
        </p>
      </section>

      <section className="kpi-strip" aria-label="Kondisi armada 30 hari terakhir dibanding target">
        {kpiRows.map((k) => {
          const ok = meetsTarget(k.key, k.value);
          const t = TARGETS[k.key];
          const target = `${t.higherIsBetter ? '≥' : '≤'} ${formatNumber(t.value)}${t.unit === '%' ? '%' : ` ${t.unit}`}`;
          return (
            <div key={k.key} className={`card kpi-tile${ok === false ? ' off' : ''}`}>
              <span className="kpi-label">{k.label}</span>
              <span className="kpi-tile-value">{k.text}</span>
              {ok != null && (
                <span className={`small ${ok ? 'status-good' : 'status-critical'}`}>
                  <span aria-hidden="true">{ok ? '✓ ' : '✕ '}</span>
                  {ok ? 'Sesuai target' : 'Di luar target'} {target}
                </span>
              )}
            </div>
          );
        })}
      </section>

      <div className="board">
        <section className="card board-col" aria-labelledby="col-bd">
          <span className="edge edge-critical" />
          <header className="board-head">
            <h2 id="col-bd">Rusak sekarang</h2>
            <span className="board-count status-critical">{s.down.length}</span>
          </header>
          <p className="board-desc">
            Unit B/D, diurutkan dari yang paling lama berhenti.
            {canWrite && ' Tombol kunci pas = update status atau tutup WO.'}
          </p>
          {s.down.length === 0 && <p className="board-empty">Semua unit bisa beroperasi.</p>}
          <ul className="board-list">
            {s.down.slice(0, LIST_LIMIT).map(({ unit, active }) => (
              <li key={unit.code}>
                <button type="button" className="board-row" onClick={() => openUnit(unit.code)}>
                  <UnitIllustration type={unit.type} width={44} />
                  <UnitPlate code={unit.code} size="sm" />
                  <span className="board-row-text">
                    <b>{active.component ?? 'Breakdown'}</b>
                    <span className={active.status === 'Waiting Part' ? 'status-critical' : 'muted'}>
                      {active.status === 'Waiting Part' ? 'Menunggu part' : active.status} · {downSince(active.start, refTime)}
                    </span>
                  </span>
                </button>
                {canWrite && (
                  <button
                    type="button"
                    className="btn-icon board-action"
                    onClick={() => setFollowUp(active)}
                    aria-label={`Tindak lanjut ${active.id} unit ${unit.code}`}
                    title="Tindak lanjut: update status atau tutup WO"
                  >
                    <Icon name="wrench" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <Link to="/health" className="board-more">
            {s.down.length > LIST_LIMIT ? `Lihat ${s.down.length - LIST_LIMIT} unit lainnya →` : 'Buka Kondisi Unit →'}
          </Link>
        </section>

        <section className="card board-col" aria-labelledby="col-pm">
          <span className="edge edge-warning" />
          <header className="board-head">
            <h2 id="col-pm">Servis jatuh tempo</h2>
            <span className="board-count status-warning">{s.pmDue.length}</span>
          </header>
          <p className="board-desc">PM yang sudah lewat atau tepat di HM jadwalnya.</p>
          {s.pmDue.length === 0 && <p className="board-empty">Tidak ada PM yang jatuh tempo.</p>}
          <ul className="board-list">
            {s.pmDue.slice(0, LIST_LIMIT).map((f) => (
              <li key={f.unit.code}>
                <button type="button" className="board-row" onClick={() => openUnit(f.unit.code)}>
                  <UnitIllustration type={f.unit.type} width={44} />
                  <UnitPlate code={f.unit.code} size="sm" />
                  <span className="board-row-text">
                    <b>{f.pmType}</b>
                    <span className="muted">lewat {formatNumber(-f.remaining)} HM</span>
                  </span>
                  <StatusTag level={f.status === 'Terlambat' ? 'critical' : 'warning'}>{f.status === 'Terlambat' ? 'Terlambat' : 'Hari ini'}</StatusTag>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/pm" className="board-more">
            {s.pmDue.length > LIST_LIMIT ? `Lihat ${s.pmDue.length - LIST_LIMIT} unit lainnya →` : 'Buka perencanaan PM →'}
          </Link>
        </section>

        <section className="card board-col" aria-labelledby="col-bl">
          <span className="edge edge-ink" />
          <header className="board-head">
            <h2 id="col-bl">Backlog tertunda</h2>
            <span className="board-count">{s.backlog.length}</span>
          </header>
          <p className="board-desc">WO belum selesai menurut umurnya. Yang paling bawah paling berisiko.</p>
          <ul className="aging-list" aria-label="Umur backlog">
            {s.aging.map((a) => (
              <li key={a.name} className={a === agingWorst && a.value > 0 ? 'worst' : undefined}>
                <span>{a.name}</span>
                <span className="aging-track" aria-hidden="true">
                  <span style={{ width: `${(a.value / agingMax) * 100}%` }} />
                </span>
                <b>{a.value}</b>
              </li>
            ))}
          </ul>
          {s.topComponent && (
            <div className="focus-box">
              <span className="kpi-label">Fokus minggu ini</span>
              <span>
                <b>{s.topComponent.name}</b>: {formatNumber(s.topComponent.value)} jam downtime dari {s.topComponent.count} kejadian dalam 30 hari.
                Penyumbang downtime terbesar.
              </span>
            </div>
          )}
          <Link to="/backlog" className="board-more">
            Buka backlog →
          </Link>
        </section>
      </div>
      {!canWrite && <p className="muted small">Login di menu Database &amp; Login untuk menindaklanjuti unit B/D langsung dari halaman ini.</p>}

      <aside className="data-note" aria-label="Tentang data">
        <b>Tentang data:</b> semua data fiktif dan sengaja dibuat dengan masalah yang umum di lapangan (MTTR di atas target, PM
        terlambat, backlog menumpuk) supaya ada temuan yang bisa ditelusuri akar masalahnya. Site A berasal dari dataset Power BI
        saya; di sini PA dihitung terhadap jam kalender sehingga angkanya berbeda dari versi Power BI (61,5%).{' '}
        <a href={KPI_DOC} target="_blank" rel="noopener noreferrer">
          Penjelasan rumus
        </a>
      </aside>

      {followUp && (
        <FollowUp workOrder={followUp} unit={unitByCode.get(followUp.unitCode)} refTime={refTime} onDone={() => setFollowUp(null)} />
      )}
    </div>
  );
}
