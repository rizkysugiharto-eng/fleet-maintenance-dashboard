// Alat bantu untuk membuat data dummy: angka acak dengan seed tetap
// (hasil selalu sama setiap dijalankan) dan simulasi hour meter (HM) harian.

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

// Pembangkit angka acak sederhana dengan seed (mulberry32)
export function createRandom(seed) {
  let a = seed;
  const random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  random.between = (min, max) => min + random() * (max - min);
  random.pick = (list) => list[Math.floor(random() * list.length)];
  return random;
}

const pad = (n) => String(n).padStart(2, '0');

export function formatDateTime(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(ms) {
  return formatDateTime(ms).slice(0, 10);
}

export const roundToMinutes = (ms) => Math.round(ms / 60000) * 60000;

// Jam tumpang tindih antara daftar interval [mulai, selesai] dengan rentang [s, e]
export function overlapHours(intervals, s, e) {
  let total = 0;
  for (const [a, b] of intervals) {
    const lo = Math.max(a, s);
    const hi = Math.min(b, e);
    if (hi > lo) total += hi - lo;
  }
  return total / HOUR;
}

/**
 * Jam operasi satu hari: rata-rata HM per hari (EWH) dikali acak 80-120%,
 * dikurangi proporsional dengan jam unit sedang down hari itu.
 */
export function dailyOperatingHours(ewh, downHours, random) {
  const available = Math.max(0, 24 - downHours);
  return Math.min(ewh * random.between(0.8, 1.2) * (available / 24), available * 0.95);
}

/**
 * Buat log HM harian (pembacaan HM di akhir hari) untuk unit yang daftar WO-nya
 * sudah diketahui. HM terakhir disamakan dengan `hmEnd` (HM saat ini di data asli).
 */
export function buildHmLogs({ unit, workOrders, from, days, hmEnd, random }) {
  const intervals = workOrders
    .filter((wo) => wo.unitCode === unit.code)
    .map((wo) => [new Date(wo.start).getTime(), wo.end ? new Date(wo.end).getTime() : from + days * DAY]);

  const increments = [];
  for (let d = 0; d < days; d++) {
    const dayStart = from + d * DAY;
    const down = overlapHours(intervals, dayStart, dayStart + DAY);
    increments.push(dailyOperatingHours(unit.ewh, down, random));
  }

  const total = increments.reduce((a, b) => a + b, 0);
  let hm = hmEnd - total;
  return increments.map((inc, d) => {
    hm += inc;
    return { unitCode: unit.code, date: formatDate(from + d * DAY), hm: Math.round(hm * 10) / 10 };
  });
}
