// Generator data dummy: armada alat berat selama tahun 2025.
// Memakai angka acak dengan "seed" tetap, jadi hasilnya selalu sama
// setiap kali dijalankan (mudah dibandingkan & di-debug).
// Semua data di sini FIKTIF — bukan data perusahaan mana pun.

import { HOUR } from '../lib/kpi.js';

export const WO_TYPES = {
  PM: 'Preventive Maintenance',
  BM: 'Breakdown Maintenance',
  CM: 'Corrective Maintenance',
};

export const UNIT_TYPES = ['Excavator', 'Dump Truck', 'Bulldozer', 'Grader', 'Wheel Loader'];

export const COMPONENTS = [
  'Engine',
  'Hydraulic',
  'Transmission',
  'Undercarriage',
  'Electrical',
  'Brake',
  'Cooling System',
  'Final Drive',
  'Attachment',
];

export const PM_COMPONENT = 'PM Service';

const DUMMY_UNITS = [
  { code: 'EX-001', type: 'Excavator', brand: 'Komatsu', model: 'PC2000-8' },
  { code: 'EX-002', type: 'Excavator', brand: 'Hitachi', model: 'EX2600-7' },
  { code: 'DT-001', type: 'Dump Truck', brand: 'Komatsu', model: 'HD785-7' },
  { code: 'DT-002', type: 'Dump Truck', brand: 'Komatsu', model: 'HD785-7' },
  { code: 'DT-003', type: 'Dump Truck', brand: 'Caterpillar', model: '777E' },
  { code: 'DT-004', type: 'Dump Truck', brand: 'Caterpillar', model: '777E' },
  { code: 'BD-001', type: 'Bulldozer', brand: 'Komatsu', model: 'D375A-6' },
  { code: 'BD-002', type: 'Bulldozer', brand: 'Caterpillar', model: 'D10T2' },
];

// Rata-rata jam antar breakdown per unit (makin kecil = makin sering rusak)
const MEAN_HOURS_BETWEEN_FAILURES = [70, 120, 95, 110, 100, 130, 60, 140];

// Bobot komponen breakdown, supaya grafik pareto terlihat realistis
const COMPONENT_WEIGHTS = [28, 22, 12, 14, 9, 6, 4, 3, 2];

const DESCRIPTIONS = {
  PM: ['Service 250 HM', 'Service 500 HM', 'Service 1000 HM', 'Ganti oli & filter'],
  BM: ['Unit breakdown di front', 'Kebocoran', 'Overheat', 'Tidak bisa start', 'Bunyi abnormal'],
  CM: ['Perbaikan terencana', 'Penggantian komponen', 'Adjustment', 'Temuan inspeksi'],
};

// Pembangkit angka acak sederhana dengan seed (mulberry32)
function createRandom(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatDateTime(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function generateDummyData(seed = 2025) {
  const random = createRandom(seed);
  const between = (min, max) => min + random() * (max - min);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const weightedPick = (list, weights) => {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = random() * total;
    for (let i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r < 0) return list[i];
    }
    return list[list.length - 1];
  };
  const roundToMinutes = (ms) => Math.round(ms / 60000) * 60000;
  const roundToThousand = (n) => Math.round(n / 1000) * 1000;

  const periodStart = new Date(2025, 0, 1).getTime();
  const periodEnd = new Date(2026, 0, 1).getTime();
  const workOrders = [];

  DUMMY_UNITS.forEach((unit, i) => {
    const meanHours = MEAN_HOURS_BETWEEN_FAILURES[i];
    let t = periodStart + between(0, 48) * HOUR;
    let nextPm = periodStart + between(150, 300) * HOUR;

    while (t < periodEnd) {
      // Waktu breakdown berikutnya mengikuti distribusi eksponensial
      const nextFailure = t - Math.log(1 - random()) * meanHours * HOUR;
      const isPm = nextPm <= nextFailure;
      const type = isPm ? 'PM' : random() < 0.25 ? 'CM' : 'BM';
      const start = roundToMinutes(isPm ? nextPm : nextFailure);
      if (start >= periodEnd) break;

      const duration =
        type === 'PM' ? between(6, 12) : type === 'CM' ? between(4, 16) : between(3, 18) + random() * random() * 40;
      const end = roundToMinutes(start + duration * HOUR);
      const cost =
        type === 'PM'
          ? between(4e6, 12e6)
          : type === 'CM'
            ? between(8e6, 40e6)
            : between(10e6, 60e6) + random() * random() * 150e6;

      // Beberapa WO di akhir tahun masih Open (belum selesai) → backlog
      const isOpen = type !== 'PM' && start > periodEnd - 12 * 24 * HOUR && random() < 0.6;

      workOrders.push({
        unitCode: unit.code,
        type,
        component: type === 'PM' ? PM_COMPONENT : weightedPick(COMPONENTS, COMPONENT_WEIGHTS),
        description: pick(DESCRIPTIONS[type]),
        start: formatDateTime(start),
        end: isOpen ? null : formatDateTime(end),
        status: isOpen ? 'Open' : 'Closed',
        cost: roundToThousand(cost),
      });

      if (isOpen) break; // unit masih down sampai akhir periode
      t = end;
      if (isPm) nextPm = end + between(250, 330) * HOUR;
    }
  });

  workOrders.sort((a, b) => a.start.localeCompare(b.start));
  workOrders.forEach((wo, i) => {
    wo.id = `WO-2025-${String(i + 1).padStart(4, '0')}`;
  });

  return { units: DUMMY_UNITS.map((u) => ({ ...u })), workOrders };
}
