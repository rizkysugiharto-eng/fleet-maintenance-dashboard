// Import & Sumber Data: lihat asal setiap data, unduh data gabungan,
// dan import work order dari file CSV (misalnya hasil export Excel).

import { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { SITES } from '../data/catalog.js';
import { SITE_A_SOURCE } from '../data/seed.js';
import { downloadCsv, parseCsv } from '../lib/csv.js';
import { formatNumber } from '../lib/format.js';
import { normalizeWorkOrder, validateWorkOrder } from '../lib/validation.js';
import PageHeader from '../components/PageHeader.jsx';
import TableWrap from '../components/TableWrap.jsx';

const TEMPLATE_COLUMNS = ['unitCode', 'type', 'status', 'start', 'end', 'component', 'problem', 'responseHours', 'delayReason', 'delayHours', 'cost'];
const TEMPLATE_ROWS = [
  { unitCode: 'DT-201', type: 'BM', status: 'Completed', start: '2026-01-05T08:00', end: '2026-01-05T15:30', component: 'Hydraulic', problem: 'Hose bocor', responseHours: 0.5, delayReason: 'Menunggu part', delayHours: 3, cost: 12500000 },
  { unitCode: 'EX-001', type: 'PM', status: 'Open', start: '2026-01-06T07:00', end: '', component: 'PM Service', problem: 'Service PM250', responseHours: '', delayReason: '', delayHours: 0, cost: 4000000 },
];
const WO_COLUMNS = ['id', 'siteId', ...TEMPLATE_COLUMNS, 'source'];

export default function ImportCenter() {
  const { data, unitByCode, importWorkOrders, canWrite } = useData();
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');

  const countBy = (pred) => data.workOrders.filter(pred).length;
  const sources = [
    {
      title: 'Site A · Dataset Power BI',
      detail: `File Excel ${SITE_A_SOURCE} (sheet Data_WO, PM_Master, PM_Compliance), dikonversi dengan scripts/convert_excel.py`,
      stats: [`${countBy((w) => w.source === 'excel')} WO`, `${data.units.filter((u) => u.siteId === 'A').length} unit`, `${data.pmLogs.filter((p) => p.siteId === 'A').length} log PM`],
    },
    {
      title: 'Site B · Kontraktor tambang (dummy)',
      detail: 'Dibuat oleh generator src/data/siteB.js: HM harian, PM tiap 250 HM, breakdown dengan alasan delay. Seluruh angka fiktif.',
      stats: [`${countBy((w) => w.source === 'generator')} WO`, `${data.units.filter((u) => u.siteId === 'B').length} unit`, `${data.pmLogs.filter((p) => p.siteId === 'B').length} log PM`],
    },
    {
      title: 'Input manual',
      detail: 'WO yang diinput lewat halaman Input Work Order.',
      stats: [`${countBy((w) => w.source === 'manual')} WO`],
    },
    {
      title: 'Import CSV',
      detail: 'WO yang di-import dari file CSV di halaman ini.',
      stats: [`${countBy((w) => w.source === 'csv')} WO`],
    },
  ];

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const rows = parseCsv(await file.text()).map((raw, i) => {
      const wo = normalizeWorkOrder(raw);
      return { line: i + 2, wo, errors: validateWorkOrder(wo, unitByCode) };
    });
    setPreview({ fileName: file.name, rows });
    setMessage('');
  }

  async function handleImport() {
    const valid = preview.rows.filter((r) => Object.keys(r.errors).length === 0).map((r) => r.wo);
    try {
      await importWorkOrders(valid);
      setMessage(`✓ ${valid.length} WO dari ${preview.fileName} berhasil di-import.`);
      setPreview(null);
    } catch (e) {
      setMessage(`✕ Gagal import: ${e.message}`);
    }
  }

  const validCount = preview?.rows.filter((r) => Object.keys(r.errors).length === 0).length ?? 0;

  return (
    <div className="page">
      <PageHeader step={1} title="Import Data">
        Masukkan banyak work order sekaligus dari file CSV (misalnya hasil export Excel), lihat asal setiap data, dan unduh data gabungan.
      </PageHeader>

      <div className="source-grid">
        {sources.map((s) => (
          <section key={s.title} className="card card-pad">
            <h2>{s.title}</h2>
            <p className="muted small" style={{ margin: '6px 0 10px' }}>
              {s.detail}
            </p>
            <div className="legend">
              {s.stats.map((x) => (
                <span key={x} className="tag">
                  {x}
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="card card-pad">
        <header className="card-header">
          <div>
            <h2>Unduh data gabungan</h2>
            <p className="muted">Seluruh data (semua site) dalam format CSV — bisa dibuka di Excel atau dipakai di Power BI.</p>
          </div>
        </header>
        <div className="form-actions" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn-ghost" onClick={() => downloadCsv('work-orders-gabungan.csv', data.workOrders, WO_COLUMNS)}>
            Work order ({formatNumber(data.workOrders.length)})
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => downloadCsv('units.csv', data.units, ['code', 'siteId', 'type', 'brand', 'model', 'pmInterval', 'ewh'])}
          >
            Master unit ({data.units.length})
          </button>
          <button type="button" className="btn-ghost" onClick={() => downloadCsv('hour-meter.csv', data.hmLogs, ['unitCode', 'date', 'hm'])}>
            Log hour meter ({formatNumber(data.hmLogs.length)})
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => downloadCsv('pm-log.csv', data.pmLogs, ['siteId', 'unitCode', 'pmType', 'hmPlan', 'hmActual'])}
          >
            Log PM ({data.pmLogs.length})
          </button>
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          Site: {SITES.map((s) => `${s.id} = ${s.description}`).join(' · ')}
        </p>
      </section>

      <section className="card card-pad">
        <header className="card-header">
          <div>
            <h2>Import work order dari CSV</h2>
            <p className="muted">
              Kolom wajib: {TEMPLATE_COLUMNS.join(', ')}. Format waktu YYYY-MM-DDTHH:mm. Pemisah koma atau titik koma.
            </p>
          </div>
          <button type="button" className="btn-ghost btn-small" onClick={() => downloadCsv('template-import-wo.csv', TEMPLATE_ROWS, TEMPLATE_COLUMNS)}>
            Unduh template
          </button>
        </header>

        <label className="dropzone">
          <span>Pilih file .csv untuk diperiksa sebelum di-import</span>
          <input type="file" accept=".csv,text/csv" onChange={handleFile} />
        </label>

        {message && (
          <p className={`alert ${message.startsWith('✓') ? 'alert-good' : ''}`} role="status" style={{ marginTop: 12 }}>
            {message}
          </p>
        )}

        {preview && (
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            <p className={validCount === preview.rows.length ? 'alert alert-good' : 'alert'}>
              {preview.fileName}: {preview.rows.length} baris · <b>{validCount} valid</b> · {preview.rows.length - validCount} bermasalah (tidak
              ikut di-import)
            </p>
            <TableWrap label="Tabel hasil pemeriksaan import" style={{ maxHeight: 360 }}>
              <table>
                <thead>
                  <tr>
                    <th className="num">Baris</th>
                    <th>Unit</th>
                    <th>Jenis</th>
                    <th>Mulai</th>
                    <th>Selesai</th>
                    <th>Status</th>
                    <th>Pemeriksaan</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 100).map((r) => (
                    <tr key={r.line}>
                      <td className="num">{r.line}</td>
                      <td className="mono">{r.wo.unitCode}</td>
                      <td>{r.wo.type}</td>
                      <td className="nowrap">{r.wo.start}</td>
                      <td className="nowrap">{r.wo.end ?? '–'}</td>
                      <td>{r.wo.status}</td>
                      <td>
                        {Object.keys(r.errors).length === 0 ? (
                          <span className="status status-good">✓ Valid</span>
                        ) : (
                          <span className="status status-critical">✕ {Object.values(r.errors).join(' ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <div className="form-actions">
              <button type="button" className="btn-primary" disabled={validCount === 0 || !canWrite} onClick={handleImport}>
                Import {validCount} WO valid
              </button>
              <button type="button" className="btn-ghost" onClick={() => setPreview(null)}>
                Batal
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
