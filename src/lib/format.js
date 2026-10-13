// Format angka & tanggal gaya Indonesia (koma desimal, titik ribuan).

export function formatNumber(value, digits = 0) {
  if (value == null || Number.isNaN(value)) return '–';
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value) {
  return value == null ? '–' : `${formatNumber(value, 1)}%`;
}

export function formatHours(value) {
  return value == null ? '–' : `${formatNumber(value, 1)} jam`;
}

// Rupiah ringkas: Rp 467,4 jt · Rp 36,5 M
export function formatRupiahCompact(value) {
  if (value == null) return '–';
  if (Math.abs(value) >= 1e9) return `Rp ${formatNumber(value / 1e9, 1)} M`;
  if (Math.abs(value) >= 1e6) return `Rp ${formatNumber(value / 1e6, 1)} jt`;
  return `Rp ${formatNumber(value)}`;
}

export function formatRupiah(value) {
  return value == null ? '–' : `Rp ${formatNumber(value)}`;
}

export function formatDateTimeText(text) {
  if (!text) return '–';
  const d = new Date(text);
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// "2025-03" → "Mar 2025"
export function formatMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

// Tanggal dari milidetik: "31 Des 2025"
export function formatDateMs(ms) {
  if (ms == null) return '–';
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Jam ringkas: 1.234 jam
export function formatHoursShort(value) {
  return value == null ? '–' : `${formatNumber(value)} jam`;
}
