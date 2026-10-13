// Kartu KPI: nama, penjelasan singkat untuk orang awam, nilai, target, dan tren kecil.

import { Sparkline } from './Charts.jsx';
import { TARGETS, meetsTarget } from '../lib/kpi.js';
import { formatNumber } from '../lib/format.js';

export default function KpiCard({ kpiKey, label, description, value, display, series, color, note }) {
  const target = TARGETS[kpiKey];
  const ok = meetsTarget(kpiKey, value);
  const level = ok == null ? 'neutral' : ok ? 'good' : 'critical';

  return (
    <div className={`card kpi-card level-${level}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-desc">{description}</span>
      <span className="kpi-value">{display}</span>
      <div className="kpi-meta">
        {target && (
          <span>
            Target {target.higherIsBetter ? '≥' : '≤'} {formatNumber(target.value)}
            {target.unit === '%' ? '%' : ` ${target.unit}`}
          </span>
        )}
        {ok != null && (
          <span className={`status status-${level}`}>
            <span aria-hidden="true">{ok ? '✓' : '✕'}</span>
            {ok ? 'Tercapai' : 'Belum tercapai'}
          </span>
        )}
        {note && <span>{note}</span>}
      </div>
      {series && <Sparkline data={series} dataKey={kpiKey} color={color} />}
    </div>
  );
}
