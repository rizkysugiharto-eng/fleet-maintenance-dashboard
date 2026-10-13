// Tabel data work order: cari, filter, tutup WO yang masih Open, dan export CSV.

import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { WO_TYPES } from '../data/dummy.js';
import { hoursBetween, parseTime } from '../lib/kpi.js';
import { formatDateTimeText, formatNumber, formatRupiah } from '../lib/format.js';

const PAGE_SIZE = 50;

function durationHours(wo) {
  return wo.end ? hoursBetween(parseTime(wo.start), parseTime(wo.end)) : null;
}

function downloadCsv(rows) {
  const header = ['No WO', 'Unit', 'Tipe', 'Komponen', 'Deskripsi', 'Mulai', 'Selesai', 'Durasi (jam)', 'Biaya (Rp)', 'Status'];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((wo) =>
    [
      wo.id,
      wo.unitCode,
      wo.type,
      wo.component,
      wo.description,
      wo.start,
      wo.end ?? '',
      durationHours(wo)?.toFixed(2) ?? '',
      wo.cost,
      wo.status,
    ]
      .map(escape)
      .join(','),
  );
  const csv = [header.map(escape).join(','), ...lines].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'work-orders.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CloseWorkOrder({ workOrder, onClose }) {
  const [open, setOpen] = useState(false);
  const [end, setEnd] = useState('');
  const invalid = end && parseTime(end) <= parseTime(workOrder.start);

  if (!open) {
    return (
      <button type="button" className="btn-ghost btn-small" onClick={() => setOpen(true)}>
        Tutup WO
      </button>
    );
  }
  return (
    <div className="close-wo">
      <input
        type="datetime-local"
        value={end}
        aria-label={`Waktu selesai ${workOrder.id}`}
        onChange={(e) => setEnd(e.target.value)}
      />
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
  const { units, workOrders, closeWorkOrder } = useData();
  const [filters, setFilters] = useState({ search: '', unitCode: '', type: '', status: '' });
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
          (!search || `${wo.id} ${wo.component} ${wo.description}`.toLowerCase().includes(search)),
      )
      .sort((a, b) => b.start.localeCompare(a.start)); // terbaru di atas
  }, [workOrders, filters]);

  return (
    <div className="page">
      <div className="page-title">
        <h1>Data work order</h1>
        <p className="muted">{formatNumber(rows.length)} dari {formatNumber(workOrders.length)} work order</p>
      </div>

      <div className="filters" role="group" aria-label="Filter work order">
        <label>
          Cari
          <input
            type="search"
            value={filters.search}
            placeholder="No WO, komponen, deskripsi"
            onChange={(e) => setFilter('search', e.target.value)}
          />
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
          Tipe
          <select value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
            <option value="">Semua tipe</option>
            {Object.keys(WO_TYPES).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">Semua status</option>
            <option>Open</option>
            <option>Closed</option>
          </select>
        </label>
        <button type="button" className="btn-ghost filters-action" onClick={() => downloadCsv(rows)}>
          Export CSV
        </button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>No WO</th>
              <th>Unit</th>
              <th>Tipe</th>
              <th>Komponen</th>
              <th>Deskripsi</th>
              <th>Mulai</th>
              <th>Selesai</th>
              <th className="num">Durasi</th>
              <th className="num">Biaya</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((wo) => (
              <tr key={wo.id}>
                <td className="nowrap">{wo.id}</td>
                <td>{wo.unitCode}</td>
                <td title={WO_TYPES[wo.type]}>{wo.type}</td>
                <td>{wo.component}</td>
                <td>{wo.description}</td>
                <td className="nowrap">{formatDateTimeText(wo.start)}</td>
                <td className="nowrap">
                  {wo.end ? formatDateTimeText(wo.end) : <CloseWorkOrder workOrder={wo} onClose={closeWorkOrder} />}
                </td>
                <td className="num">{durationHours(wo) == null ? '–' : `${formatNumber(durationHours(wo), 1)} jam`}</td>
                <td className="num nowrap">{formatRupiah(wo.cost)}</td>
                <td>
                  <span className={`badge badge-${wo.status.toLowerCase()}`}>{wo.status}</span>
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
