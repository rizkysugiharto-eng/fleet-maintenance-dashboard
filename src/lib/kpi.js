// Rumus KPI maintenance — "otak" aplikasi.
// Mirip DAX measure di Power BI: setiap fungsi menerima data mentah
// (unit, work order, log hour meter) lalu mengembalikan angka.
// Semua waktu dihitung dalam milidetik (ms) lalu dikonversi ke jam.

import { isUnscheduled } from '../data/catalog.js';

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

// Target KPI. higherIsBetter menentukan arah "bagus".
export const TARGETS = {
  pa: { value: 85, unit: '%', higherIsBetter: true },
  ma: { value: 85, unit: '%', higherIsBetter: true },
  ua: { value: 75, unit: '%', higherIsBetter: true },
  mtbf: { value: 100, unit: 'jam', higherIsBetter: true },
  mttr: { value: 12, unit: 'jam', higherIsBetter: false },
};

export function meetsTarget(key, value) {
  const target = TARGETS[key];
  if (!target || value == null) return null;
  return target.higherIsBetter ? value >= target.value : value <= target.value;
}

// ---------- Waktu ----------

// "2025-03-01" → tengah malam waktu lokal; "2025-03-01T07:30" → waktu lokal
export function toMs(text) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  return new Date(text).getTime();
}

export function hoursBetween(startMs, endMs) {
  return (endMs - startMs) / HOUR;
}

// Periode dari tanggal awal s.d. tanggal akhir (inklusif) → [from, to)
export function periodFromDates(fromDate, toDate) {
  return { from: toMs(fromDate), to: toMs(toDate) + DAY };
}

// ---------- Hour meter (HM) ----------

/**
 * Indeks log HM per unit: Map kode unit → daftar {t, hm} urut waktu.
 * Pembacaan HM pada tanggal X dianggap terjadi di akhir hari X.
 */
export function buildHmIndex(hmLogs) {
  const index = new Map();
  for (const log of hmLogs) {
    if (!index.has(log.unitCode)) index.set(log.unitCode, []);
    index.get(log.unitCode).push({ t: toMs(log.date) + DAY, hm: log.hm });
  }
  for (const series of index.values()) {
    series.sort((a, b) => a.t - b.t);
    // Titik bantu satu hari sebelum pembacaan pertama, supaya hari pertama ikut terhitung
    if (series.length >= 2) {
      const step = series[1].hm - series[0].hm;
      series.unshift({ t: series[0].t - DAY, hm: series[0].hm - step });
    }
  }
  return index;
}

// HM pada waktu t (interpolasi linear di antara dua pembacaan)
export function hmAt(series, t) {
  if (!series || series.length === 0) return null;
  if (t <= series[0].t) return series[0].hm;
  const last = series[series.length - 1];
  if (t >= last.t) return last.hm;
  let lo = 0;
  let hi = series.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (series[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = series[lo];
  const b = series[hi];
  return a.hm + ((b.hm - a.hm) * (t - a.t)) / (b.t - a.t);
}

export function operatingHours(hmIndex, unitCode, from, to) {
  const series = hmIndex.get(unitCode);
  if (!series) return 0;
  return Math.max(0, hmAt(series, to) - hmAt(series, from));
}

// ---------- Downtime ----------

// Potong durasi WO ke dalam periode [from, to).
// WO yang belum selesai (end kosong) dianggap unit masih down sampai akhir periode.
export function clipToPeriod(wo, from, to) {
  const start = toMs(wo.start);
  const end = wo.end ? toMs(wo.end) : to;
  const s = Math.max(start, from);
  const e = Math.min(end, to);
  return e > s ? [s, e] : null;
}

// Jumlahkan panjang interval; bagian yang tumpang tindih dihitung sekali
function mergedLength(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let current = null;
  for (const [s, e] of sorted) {
    if (!current || s > current[1]) {
      if (current) total += current[1] - current[0];
      current = [s, e];
    } else {
      current[1] = Math.max(current[1], e);
    }
  }
  if (current) total += current[1] - current[0];
  return total;
}

export function groupByUnit(workOrders) {
  const map = new Map();
  for (const wo of workOrders) {
    if (!map.has(wo.unitCode)) map.set(wo.unitCode, []);
    map.get(wo.unitCode).push(wo);
  }
  return map;
}

export function filterByUnits(workOrders, units) {
  const codes = new Set(units.map((u) => u.code));
  return workOrders.filter((wo) => codes.has(wo.unitCode));
}

export function startedIn(wo, from, to) {
  const t = toMs(wo.start);
  return t >= from && t < to;
}

// ---------- KPI utama ----------

/**
 * Hitung KPI untuk sekumpulan unit dalam periode [from, to).
 *
 * - Total hours   = jumlah unit × jam kalender dalam periode
 * - Downtime      = jam unit tidak siap karena maintenance (semua jenis WO)
 * - Jam operasi   = selisih hour meter (HM) awal dan akhir periode
 * - PA (%)        = (total hours − downtime) ÷ total hours
 * - MA (%)        = jam operasi ÷ (jam operasi + downtime)
 * - UA (%)        = jam operasi ÷ (total hours − downtime)
 * - MTBF (jam)    = jam operasi ÷ jumlah breakdown tak terjadwal (BM + BAC)
 * - MTTR (jam)    = rata-rata lama perbaikan breakdown tak terjadwal yang sudah selesai
 */
export function calcKpi({ units, workOrders, hmIndex, from, to }) {
  const wos = filterByUnits(workOrders, units);
  const byUnit = groupByUnit(wos);

  const totalHours = hoursBetween(from, to) * units.length;
  let downtimeHours = 0;
  let scheduledDowntime = 0;
  let unscheduledDowntime = 0;
  let operating = 0;

  for (const unit of units) {
    const intervals = [];
    for (const wo of byUnit.get(unit.code) ?? []) {
      const clipped = clipToPeriod(wo, from, to);
      if (!clipped) continue;
      intervals.push(clipped);
      const hours = hoursBetween(clipped[0], clipped[1]);
      if (isUnscheduled(wo.type)) unscheduledDowntime += hours;
      else scheduledDowntime += hours;
    }
    downtimeHours += mergedLength(intervals) / HOUR;
    operating += hmIndex ? operatingHours(hmIndex, unit.code, from, to) : 0;
  }

  const inPeriod = wos.filter((wo) => startedIn(wo, from, to));
  const breakdowns = inPeriod.filter((wo) => isUnscheduled(wo.type));
  const closedBreakdowns = breakdowns.filter((wo) => wo.end);
  const repairHours = closedBreakdowns.reduce((sum, wo) => sum + hoursBetween(toMs(wo.start), toMs(wo.end)), 0);
  const available = totalHours - downtimeHours;

  return {
    totalHours,
    downtimeHours,
    scheduledDowntime,
    unscheduledDowntime,
    operatingHours: operating,
    pa: totalHours > 0 ? (available / totalHours) * 100 : null,
    ma: operating + downtimeHours > 0 ? (operating / (operating + downtimeHours)) * 100 : null,
    ua: available > 0 ? (operating / available) * 100 : null,
    breakdownCount: breakdowns.length,
    mtbf: breakdowns.length > 0 ? operating / breakdowns.length : null,
    mttr: closedBreakdowns.length > 0 ? repairHours / closedBreakdowns.length : null,
    woCount: inPeriod.length,
    backlog: wos.filter((wo) => wo.status !== 'Completed' && toMs(wo.start) < to).length,
    cost: inPeriod.reduce((sum, wo) => sum + (wo.cost || 0), 0),
  };
}

// ---------- Pembagian waktu (bucket) untuk grafik tren ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function chooseGranularity(from, to) {
  const days = (to - from) / DAY;
  if (days <= 62) return 'day';
  if (days <= 400) return 'week';
  return 'month';
}

export function buildBuckets(from, to, granularity = chooseGranularity(from, to)) {
  const buckets = [];
  let start = from;
  while (start < to) {
    const d = new Date(start);
    let end;
    if (granularity === 'day') end = start + DAY;
    else if (granularity === 'week') end = start + 7 * DAY;
    else end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    end = Math.min(end, to);
    const label =
      granularity === 'month'
        ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
        : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    const nominal = granularity === 'day' ? DAY : granularity === 'week' ? 7 * DAY : 28 * DAY;
    buckets.push({ start, end, label, granularity, partial: end - start < nominal });
    start = end;
  }
  return buckets;
}

// KPI untuk setiap bucket (dipakai sparkline & tren)
export function kpiSeries({ units, workOrders, hmIndex, buckets }) {
  return buckets.map((b) => ({
    label: b.label,
    ...calcKpi({ units, workOrders, hmIndex, from: b.start, to: b.end }),
  }));
}
