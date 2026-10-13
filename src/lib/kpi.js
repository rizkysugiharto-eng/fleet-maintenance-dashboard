// Rumus KPI maintenance.
// Mirip DAX measure di Power BI: setiap fungsi menerima data mentah
// (daftar unit & work order) lalu mengembalikan angka atau tabel ringkasan.
// Semua waktu dihitung dalam milidetik (ms) lalu dikonversi ke jam.

export const HOUR = 60 * 60 * 1000;
export const TARGET_PA = 85; // target Physical Availability (%)

export function parseTime(text) {
  // Format input: "YYYY-MM-DDTHH:mm" (waktu lokal)
  return new Date(text).getTime();
}

export function hoursBetween(startMs, endMs) {
  return (endMs - startMs) / HOUR;
}

// ---------- Periode bulanan ("YYYY-MM") ----------

export function monthStart(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).getTime();
}

export function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function listMonths(fromMonth, toMonth) {
  const months = [];
  for (let m = fromMonth; m <= toMonth; m = addMonths(m, 1)) months.push(m);
  return months;
}

// Rentang bulan yang ada datanya, untuk nilai awal filter.
export function dataMonthRange(workOrders) {
  if (workOrders.length === 0) {
    const now = new Date();
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return { min: m, max: m };
  }
  const months = workOrders.map((wo) => wo.start.slice(0, 7)).sort();
  return { min: months[0], max: months[months.length - 1] };
}

// ---------- Downtime ----------

// Potong durasi WO ke dalam periode [from, to).
// WO yang masih Open dianggap unit masih down sampai akhir periode.
export function clipToPeriod(wo, from, to) {
  const start = parseTime(wo.start);
  const end = wo.end ? parseTime(wo.end) : to;
  const s = Math.max(start, from);
  const e = Math.min(end, to);
  return e > s ? [s, e] : null;
}

// Jumlahkan panjang interval, tapi bagian yang tumpang tindih dihitung sekali
// (misal PM dan perbaikan dikerjakan bersamaan pada unit yang sama).
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

export function unitDowntimeHours(workOrders, unitCode, from, to) {
  const intervals = workOrders
    .filter((wo) => wo.unitCode === unitCode)
    .map((wo) => clipToPeriod(wo, from, to))
    .filter(Boolean);
  return mergedLength(intervals) / HOUR;
}

// ---------- KPI utama ----------

/**
 * Hitung KPI untuk sekumpulan unit dalam periode [from, to).
 *
 * - Calendar hours  = jumlah unit x jam dalam periode
 * - PA (%)          = (calendar hours - downtime) / calendar hours x 100
 * - MTBF (jam)      = jam operasi / jumlah breakdown (BM)
 * - MTTR (jam)      = total jam perbaikan BM / jumlah BM yang sudah selesai
 *
 * Penyederhanaan: jam operasi = calendar hours - downtime (tanpa memisahkan
 * standby/delay). Di lapangan biasanya memakai hour meter (HM) unit.
 */
export function calcKpi({ units, workOrders, from, to }) {
  const unitCodes = new Set(units.map((u) => u.code));
  const wos = workOrders.filter((wo) => unitCodes.has(wo.unitCode));

  const calendarHours = hoursBetween(from, to) * units.length;
  const downtimeHours = units.reduce(
    (sum, u) => sum + unitDowntimeHours(wos, u.code, from, to),
    0,
  );
  const operatingHours = calendarHours - downtimeHours;

  const inPeriod = wos.filter((wo) => {
    const t = parseTime(wo.start);
    return t >= from && t < to;
  });
  const breakdowns = inPeriod.filter((wo) => wo.type === 'BM');
  const closedBreakdowns = breakdowns.filter((wo) => wo.end);
  const repairHours = closedBreakdowns.reduce(
    (sum, wo) => sum + hoursBetween(parseTime(wo.start), parseTime(wo.end)),
    0,
  );

  return {
    calendarHours,
    downtimeHours,
    operatingHours,
    pa: calendarHours > 0 ? (operatingHours / calendarHours) * 100 : null,
    breakdownCount: breakdowns.length,
    mtbf: breakdowns.length > 0 ? operatingHours / breakdowns.length : null,
    mttr: closedBreakdowns.length > 0 ? repairHours / closedBreakdowns.length : null,
    woCount: inPeriod.length,
    backlog: wos.filter((wo) => wo.status === 'Open' && parseTime(wo.start) < to).length,
    cost: inPeriod.reduce((sum, wo) => sum + wo.cost, 0),
  };
}

// ---------- Tabel ringkasan untuk grafik ----------

export function paByUnit({ units, workOrders, from, to }) {
  return units.map((u) => ({
    name: u.code,
    value: calcKpi({ units: [u], workOrders, from, to }).pa,
  }));
}

export function monthlyPa({ units, workOrders, fromMonth, toMonth }) {
  return listMonths(fromMonth, toMonth).map((month) => ({
    name: month,
    value: calcKpi({
      units,
      workOrders,
      from: monthStart(month),
      to: monthStart(addMonths(month, 1)),
    }).pa,
  }));
}

// Jumlahkan jam (dipotong ke periode) per kelompok, urut dari terbesar.
function sumHoursBy(workOrders, from, to, keyOf) {
  const totals = new Map();
  for (const wo of workOrders) {
    const clipped = clipToPeriod(wo, from, to);
    if (!clipped) continue;
    const key = keyOf(wo);
    totals.set(key, (totals.get(key) || 0) + hoursBetween(clipped[0], clipped[1]));
  }
  return [...totals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function filterByUnits(workOrders, units) {
  const codes = new Set(units.map((u) => u.code));
  return workOrders.filter((wo) => codes.has(wo.unitCode));
}

export function downtimeByType({ units, workOrders, from, to }) {
  return sumHoursBy(filterByUnits(workOrders, units), from, to, (wo) => wo.type);
}

// Pareto: komponen mana yang paling banyak menyebabkan downtime breakdown.
export function breakdownByComponent({ units, workOrders, from, to }) {
  const bm = filterByUnits(workOrders, units).filter((wo) => wo.type === 'BM');
  return sumHoursBy(bm, from, to, (wo) => wo.component);
}

export function costByUnit({ units, workOrders, from, to }) {
  return units
    .map((u) => ({
      name: u.code,
      value: calcKpi({ units: [u], workOrders, from, to }).cost,
    }))
    .sort((a, b) => b.value - a.value);
}
