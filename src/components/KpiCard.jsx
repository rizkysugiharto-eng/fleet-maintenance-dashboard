// Kartu KPI: nama, penjelasan singkat untuk orang awam, nilai, target, dan tren kecil.
// Status target ditampilkan sebagai ikon + teks, tidak hanya warna.

import { Sparkline } from './Charts.jsx';
import { LevelBadge } from './Badges.jsx';
import { TARGETS, meetsTarget } from '../lib/kpi.js';
import { formatNumber } from '../lib/format.js';

export default function KpiCard({ kpiKey, label, description, display, value, series, color, note }) {
  const target = TARGETS[kpiKey];
  const ok = meetsTarget(kpiKey, value);

  return (
    <div className="card kpi-card">
      <span className="kpi-label">{label}</span>
      <span className="kpi-desc">{description}</span>
      <span className="kpi-value">{display}</span>
      <div className="kpi-meta">
        {ok != null && <LevelBadge level={ok ? 'good' : 'critical'}>{ok ? 'Sesuai target' : 'Di bawah target'}</LevelBadge>}
        {target && (
          <span>
            Target {target.higherIsBetter ? '≥' : '≤'} {formatNumber(target.value)}
            {target.unit === '%' ? '%' : ` ${target.unit}`}
          </span>
        )}
        {note && <span>{note}</span>}
      </div>
      {series && <Sparkline data={series} dataKey={kpiKey} color={color} />}
    </div>
  );
}
