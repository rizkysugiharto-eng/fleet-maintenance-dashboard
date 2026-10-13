// Label status. Selalu ikon + teks, jadi artinya tidak hanya bergantung pada warna.

const ICONS = { good: '✓', warning: '!', serious: '!', critical: '✕', neutral: '•' };

export function LevelBadge({ level, children }) {
  return (
    <span className={`badge status-${level}`}>
      <span aria-hidden="true">{ICONS[level]}</span>
      {children}
    </span>
  );
}

const STATUS_LEVEL = { Completed: 'good', 'In Progress': 'warning', 'Waiting Part': 'serious', Open: 'critical' };

export function StatusBadge({ status }) {
  return <LevelBadge level={STATUS_LEVEL[status] ?? 'neutral'}>{status}</LevelBadge>;
}

export function TypeTag({ type }) {
  return <span className="tag">{type}</span>;
}

export { STATUS_LEVEL };
