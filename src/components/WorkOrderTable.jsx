// Tabel daftar work order ringkas (dipakai di drilldown heatmap & detail unit).

import { useData } from '../context/DataContext.jsx';
import { formatDateTimeText, formatNumber, formatRupiahCompact } from '../lib/format.js';
import { hoursBetween, toMs } from '../lib/kpi.js';
import { StatusBadge, TypeTag } from './Badges.jsx';
import TableWrap from './TableWrap.jsx';

export const durationOf = (wo) => (wo.end ? hoursBetween(toMs(wo.start), toMs(wo.end)) : null);

export default function WorkOrderTable({ workOrders, showUnit = true, limit = 200 }) {
  const { openUnit } = useData();
  return (
    <TableWrap label="Tabel work order">
      <table>
        <thead>
          <tr>
            <th>No WO</th>
            {showUnit && <th>Unit</th>}
            <th>Tipe</th>
            <th>Komponen / masalah</th>
            <th>Mulai</th>
            <th className="num">Durasi</th>
            <th>Delay</th>
            <th className="num">Biaya</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {workOrders.slice(0, limit).map((wo) => (
            <tr key={wo.id}>
              <td className="mono nowrap">{wo.id}</td>
              {showUnit && (
                <td>
                  <button type="button" className="link-button" onClick={() => openUnit(wo.unitCode)}>
                    {wo.unitCode}
                  </button>
                </td>
              )}
              <td>
                <TypeTag type={wo.type} />
              </td>
              <td>{[wo.component, wo.problem].filter(Boolean).join(' · ') || <span className="muted">Tidak tercatat</span>}</td>
              <td className="nowrap">{formatDateTimeText(wo.start)}</td>
              <td className="num nowrap">{durationOf(wo) == null ? 'Berjalan' : `${formatNumber(durationOf(wo), 1)} jam`}</td>
              <td className="nowrap">{wo.delayReason ? `${wo.delayReason} (${formatNumber(wo.delayHours, 1)} j)` : '–'}</td>
              <td className="num nowrap">{formatRupiahCompact(wo.cost)}</td>
              <td>
                <StatusBadge status={wo.status} />
              </td>
            </tr>
          ))}
          {workOrders.length === 0 && (
            <tr>
              <td colSpan={9} className="empty">
                Tidak ada work order.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {workOrders.length > limit && <p className="muted small">Menampilkan {limit} dari {workOrders.length} WO.</p>}
    </TableWrap>
  );
}
