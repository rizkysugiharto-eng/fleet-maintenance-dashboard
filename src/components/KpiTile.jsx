// Kotak angka KPI. "status" (opsional) menampilkan ikon + teks,
// jadi artinya tidak hanya bergantung pada warna.

export default function KpiTile({ label, value, note, status, hero = false }) {
  return (
    <div className={`card kpi-tile${hero ? ' kpi-hero' : ''}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {status && (
        <span className={`status status-${status.level}`}>
          <span aria-hidden="true">{status.level === 'good' ? '✓' : '!'}</span> {status.text}
        </span>
      )}
      {note && <span className="kpi-note muted">{note}</span>}
    </div>
  );
}
