// Backlog: semua WO yang belum selesai, dikelompokkan berdasarkan umur (aging).
// Backlog yang menumpuk lama = risiko unit rusak lebih parah.

import { useMemo, useState } from 'react';
import { StatusBadge, TypeTag } from '../components/Badges.jsx';
import ChartCard from '../components/ChartCard.jsx';
import { HorizontalBarChart } from '../components/Charts.jsx';
import { useData } from '../context/DataContext.jsx';
import { formatDateMs, formatDateTimeText, formatNumber, formatRupiahCompact } from '../lib/format.js';
import { DAY } from '../lib/kpi.js';
import { agingSummary, backlogItems } from '../lib/planning.js';
import PageHeader from '../components/PageHeader.jsx';
import TableWrap from '../components/TableWrap.jsx';

export default function Backlog() {
  const { workOrders, refTime, openUnit } = useData();
  const [status, setStatus] = useState('');

  const items = useMemo(() => backlogItems(workOrders, refTime), [workOrders, refTime]);
  const aging = agingSummary(items);
  const byStatus = ['Open', 'In Progress', 'Waiting Part'].map((s) => ({ name: s, value: items.filter((it) => it.status === s).length }));
  const shown = items.filter((it) => !status || it.status === status);
  const old = aging[aging.length - 1].value;

  return (
    <div className="page">
      <PageHeader step={2} title="Backlog">
        Pekerjaan yang belum selesai. Makin lama backlog dibiarkan, makin besar risiko kerusakan lanjutan. {formatNumber(items.length)} WO
        belum selesai, {formatNumber(old)} di antaranya lebih dari 90 hari (data s.d. {formatDateMs(refTime - DAY)}).
      </PageHeader>

      <div className="grid-2">
        <ChartCard
          title="Umur backlog"
          subtitle="Jumlah WO per rentang umur"
          rows={aging}
          columns={[
            { label: 'Umur', render: (x) => x.name },
            { label: 'WO', numeric: true, render: (x) => x.value },
          ]}
        >
          <HorizontalBarChart data={aging} formatValue={(v) => `${formatNumber(v)} WO`} formatTick={(v) => formatNumber(v)} labelWidth={84} highlight="max" />
        </ChartCard>
        <ChartCard
          title="Backlog per status"
          subtitle="Klik status di bawah untuk menyaring tabel"
          rows={byStatus}
          columns={[
            { label: 'Status', render: (x) => x.name },
            { label: 'WO', numeric: true, render: (x) => x.value },
          ]}
        >
          <HorizontalBarChart
            data={byStatus}
            formatValue={(v) => `${formatNumber(v)} WO`}
            formatTick={(v) => formatNumber(v)}
            labelWidth={96}
            onSelect={(name) => setStatus(status === name ? '' : name)}
          />
        </ChartCard>
      </div>

      <section className="card card-pad">
        <header className="card-header">
          <div>
            <h2>Daftar backlog</h2>
            <p className="muted">Diurutkan dari yang paling lama{status && ` · filter: ${status}`}</p>
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
            <option value="">Semua status</option>
            {byStatus.map((s) => (
              <option key={s.name}>{s.name}</option>
            ))}
          </select>
        </header>
        <TableWrap label="Tabel daftar backlog">
          <table>
            <thead>
              <tr>
                <th>No WO</th>
                <th>Unit</th>
                <th>Jenis</th>
                <th>Komponen / masalah</th>
                <th>Dibuat</th>
                <th className="num">Umur</th>
                <th>Delay</th>
                <th className="num">Biaya</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 200).map((wo) => (
                <tr key={wo.id}>
                  <td className="mono nowrap">{wo.id}</td>
                  <td>
                    <button type="button" className="link-button" onClick={() => openUnit(wo.unitCode)}>
                      {wo.unitCode}
                    </button>
                  </td>
                  <td>
                    <TypeTag type={wo.type} />
                  </td>
                  <td>{[wo.component, wo.problem].filter(Boolean).join(' · ') || <span className="muted">Tidak tercatat</span>}</td>
                  <td className="nowrap">{formatDateTimeText(wo.start)}</td>
                  <td className={`num ${wo.ageDays > 90 ? 'status-critical' : ''}`}>{wo.ageDays} hari</td>
                  <td>{wo.delayReason ?? '–'}</td>
                  <td className="num nowrap">{formatRupiahCompact(wo.cost)}</td>
                  <td>
                    <StatusBadge status={wo.status} />
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">
                    Tidak ada backlog. 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>
      </section>
    </div>
  );
}
