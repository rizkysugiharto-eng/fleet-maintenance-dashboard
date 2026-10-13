// Laporan Work Order: cari, filter, ubah status, tutup WO, dan export CSV.

import { useMemo, useState } from 'react';
import { StatusBadge, TypeTag } from '../components/Badges.jsx';
import { durationOf } from '../components/WorkOrderTable.jsx';
import { useData } from '../context/DataContext.jsx';
import { DELAY_REASONS, STATUSES, WO_TYPES } from '../data/catalog.js';
import { formatDateTimeText, formatNumber, formatRupiah } from '../lib/format.js';
import { downloadCsv } from '../lib/csv.js';
import { toMs } from '../lib/kpi.js';
import PageHeader from '../components/PageHeader.jsx';

const PAGE_SIZE = 50;
const CSV_COLUMNS = ['id', 'siteId', 'unitCode', 'type', 'status', 'start', 'end', 'component', 'problem', 'responseHours', 'delayReason', 'delayHours', 'cost', 'source'];

function CloseWorkOrder({ workOrder, onClose, disabled }) {
  const [open, setOpen] = useState(false);
  const [end, setEnd] = useState('');
  const invalid = end && toMs(end) <= toMs(workOrder.start);

  if (!open) {
    return (
      <button type="button" className="btn-ghost btn-small" onClick={() => setOpen(true)} disabled={disabled}>
        Tutup WO
      </button>
    );
  }
  return (
    <div className="close-wo">
      <input type="datetime-local" value={end} aria-label={`Waktu selesai ${workOrder.id}`} onChange={(e) => setEnd(e.target.value)} />
      <button type="button" className="btn-primary btn-small" disabled={!end || invalid} onClick={() => onClose(workOrder.id, end)}>
        Simpan
      </button>
      <button type="button" className="btn-ghost btn-small" onClick={() => setOpen(false)}>
        Batal
      </button>
      {invalid && <span className="field-error">Harus setelah waktu mulai</span>}
    </div>
  );
}

export default function WorkOrders() {
  const { units, workOrders, closeWorkOrder, updateWorkOrderStatus, openUnit, canWrite } = useData();
  const [error, setError] = useState('');
  // Jalankan aksi simpan; bila gagal (mis. belum login), tampilkan pesannya
  const attempt = (fn) => async (...args) => {
    try {
      setError('');
      await fn(...args);
    } catch (e) {
      setError(e.message);
    }
  };
  const [filters, setFilters] = useState({ search: '', unitCode: '', type: '', status: '', delay: '' });
  const [limit, setLimit] = useState(PAGE_SIZE);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setLimit(PAGE_SIZE);
  };

  const rows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return workOrders
      .filter(
        (wo) =>
          (!filters.unitCode || wo.unitCode === filters.unitCode) &&
          (!filters.type || wo.type === filters.type) &&
          (!filters.status || wo.status === filters.status) &&
          (!filters.delay || wo.delayReason === filters.delay) &&
          (!search || `${wo.id} ${wo.unitCode} ${wo.component ?? ''} ${wo.problem ?? ''}`.toLowerCase().includes(search)),
      )
      .sort((a, b) => b.start.localeCompare(a.start));
  }, [workOrders, filters]);

  return (
    <div className="page">
      <PageHeader
        step={2}
        title="Laporan Work Order"
        actions={
          <button type="button" className="btn-ghost" onClick={() => downloadCsv('work-orders.csv', rows, CSV_COLUMNS)}>
            Export CSV ({formatNumber(rows.length)})
          </button>
        }
      >
        Semua pekerjaan maintenance yang tercatat ({formatNumber(rows.length)} dari {formatNumber(workOrders.length)} sesuai filter, terbaru di
        atas). Ubah status atau tutup WO yang sudah selesai di sini.
      </PageHeader>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <div className="card filters" role="group" aria-label="Filter work order">
        <label>
          Cari
          <input type="search" value={filters.search} placeholder="No WO, unit, komponen" onChange={(e) => setFilter('search', e.target.value)} />
        </label>
        <label>
          Unit
          <select value={filters.unitCode} onChange={(e) => setFilter('unitCode', e.target.value)}>
            <option value="">Semua unit</option>
            {units.map((u) => (
              <option key={u.code}>{u.code}</option>
            ))}
          </select>
        </label>
        <label>
          Jenis
          <select value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
            <option value="">Semua jenis</option>
            {Object.entries(WO_TYPES).map(([code, t]) => (
              <option key={code} value={code}>
                {code} · {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">Semua status</option>
            {Object.keys(STATUSES).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Alasan delay
          <select value={filters.delay} onChange={(e) => setFilter('delay', e.target.value)}>
            <option value="">Semua</option>
            {DELAY_REASONS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>No WO</th>
              <th>Unit</th>
              <th>Jenis</th>
              <th>Komponen / masalah</th>
              <th>Mulai</th>
              <th>Selesai</th>
              <th className="num">Durasi</th>
              <th>Delay</th>
              <th className="num">Biaya</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((wo) => (
              <tr key={wo.id}>
                <td className="mono nowrap">{wo.id}</td>
                <td>
                  <button type="button" className="link-button" onClick={() => openUnit(wo.unitCode)}>
                    {wo.unitCode}
                  </button>
                </td>
                <td title={WO_TYPES[wo.type]?.label}>
                  <TypeTag type={wo.type} />
                </td>
                <td>{[wo.component, wo.problem].filter(Boolean).join(' · ') || <span className="muted">Tidak tercatat</span>}</td>
                <td className="nowrap">{formatDateTimeText(wo.start)}</td>
                <td className="nowrap">{wo.end ? formatDateTimeText(wo.end) : <CloseWorkOrder workOrder={wo} onClose={attempt(closeWorkOrder)} disabled={!canWrite} />}</td>
                <td className="num nowrap">{durationOf(wo) == null ? '–' : `${formatNumber(durationOf(wo), 1)} jam`}</td>
                <td className="nowrap">{wo.delayReason ? `${wo.delayReason} · ${formatNumber(wo.delayHours, 1)} j` : '–'}</td>
                <td className="num nowrap">{formatRupiah(wo.cost)}</td>
                <td>
                  {wo.status === 'Completed' ? (
                    <StatusBadge status={wo.status} />
                  ) : (
                    <select
                      value={wo.status}
                      onChange={(e) => attempt(updateWorkOrderStatus)(wo.id, e.target.value)}
                      disabled={!canWrite}
                      aria-label={`Status ${wo.id}`}
                    >
                      {Object.keys(STATUSES)
                        .filter((s) => s !== 'Completed')
                        .map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="empty">
                  Tidak ada work order yang cocok dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > limit && (
        <button type="button" className="btn-ghost show-more" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
          Tampilkan {Math.min(PAGE_SIZE, rows.length - limit)} lagi
        </button>
      )}
    </div>
  );
}
