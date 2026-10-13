// Site B: data dummy kontraktor tambang (20 unit, tahun 2025).
// Struktur mengikuti pola data tambang pada umumnya: HM harian per unit,
// PM tiap 250 HM, breakdown tak terjadwal dengan alasan delay, dan status perbaikan.
// Semua angka FIKTIF dari simulasi acak — bukan data perusahaan mana pun.

import { COMPONENTS, PM_COMPONENT, pmTypeForHm } from './catalog.js';
import {
  DAY,
  HOUR,
  createRandom,
  dailyOperatingHours,
  formatDate,
  formatDateTime,
  overlapHours,
  roundToMinutes,
} from './simulate.js';

const UNITS = [
  ['EXC-101', 'Excavator', 'Komatsu', 'PC2000-8', 16, 8400],
  ['EXC-102', 'Excavator', 'Komatsu', 'PC2000-8', 16, 11250],
  ['EXC-103', 'Excavator', 'Hitachi', 'EX2600-7', 15, 6900],
  ['EXC-104', 'Excavator', 'Komatsu', 'PC1250-8', 15, 14100],
  ['DT-201', 'Dump Truck', 'Komatsu', 'HD785-7', 17, 18400],
  ['DT-202', 'Dump Truck', 'Komatsu', 'HD785-7', 17, 21300],
  ['DT-203', 'Dump Truck', 'Komatsu', 'HD785-7', 18, 9600],
  ['DT-204', 'Dump Truck', 'Komatsu', 'HD785-7', 17, 15800],
  ['DT-205', 'Dump Truck', 'Komatsu', 'HD785-7', 16, 24050],
  ['DT-206', 'Dump Truck', 'Caterpillar', '777E', 17, 12700],
  ['DT-207', 'Dump Truck', 'Caterpillar', '777E', 16, 7300],
  ['DT-208', 'Dump Truck', 'Caterpillar', '777E', 17, 19900],
  ['DZ-301', 'Bulldozer', 'Komatsu', 'D375A-6', 14, 13200],
  ['DZ-302', 'Bulldozer', 'Caterpillar', 'D10T2', 14, 10450],
  ['GD-401', 'Grader', 'Caterpillar', '16M', 12, 9800],
  ['WT-501', 'Water Truck', 'Hino', 'FM260JD', 13, 16200],
  ['WT-502', 'Water Truck', 'Hino', 'FM260JD', 12, 8900],
  ['FT-601', 'Fuel Truck', 'Hino', 'FM260JD', 10, 11700],
  ['LV-701', 'Light Vehicle', 'Toyota', 'Hilux 2.4', 9, 5400],
  ['LV-702', 'Light Vehicle', 'Toyota', 'Hilux 2.4', 9, 3200],
];

// Rata-rata jam operasi antar breakdown per tipe unit (makin kecil = makin sering rusak)
const MTBF_BY_TYPE = {
  Excavator: 85,
  'Dump Truck': 105,
  Bulldozer: 70,
  Grader: 140,
  'Water Truck': 160,
  'Fuel Truck': 210,
  'Light Vehicle': 380,
};

// Komponen yang paling sering rusak dibuat lebih berat bobotnya (supaya pareto realistis)
const COMPONENT_WEIGHTS = {
  Engine: 22,
  Hydraulic: 20,
  Transmission: 10,
  Undercarriage: 12,
  Electrical: 11,
  Brake: 6,
  'Final Drive': 4,
  Tyre: 9,
  'Cooling System': 4,
  Attachment: 2,
};

const PM_DURATION = { PM250: [4, 6], PM500: [6, 9], PM1000: [10, 14] };

function weightedPick(random, weights) {
  const entries = Object.entries(weights);
  let r = random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [key, w] of entries) {
    r -= w;
    if (r < 0) return key;
  }
  return entries[entries.length - 1][0];
}

export function generateSiteB({ seed = 77, year = 2025 } = {}) {
  const random = createRandom(seed);
  const from = new Date(year, 0, 1).getTime();
  const days = Math.round((new Date(year + 1, 0, 1).getTime() - from) / DAY);
  const periodEnd = from + days * DAY;

  const units = [];
  const workOrders = [];
  const hmLogs = [];
  const pmLogs = [];

  for (const [code, type, brand, model, ewh, hmStartRaw] of UNITS) {
    const unit = { code, siteId: 'B', type, brand, model, pmInterval: 250, ewh };
    units.push(unit);

    const mtbf = MTBF_BY_TYPE[type] * random.between(0.75, 1.25);
    const intervals = []; // [mulai, selesai] setiap WO unit ini
    let busyUntil = from;
    let hm = hmStartRaw + random.between(0, 200);
    let nextPmDue = Math.ceil(hm / 250) * 250;
    let pmOffset = random.between(-10, 40);

    const addWorkOrder = (wo, startMs, durationHours) => {
      const start = roundToMinutes(Math.max(startMs, busyUntil));
      const end = roundToMinutes(start + durationHours * HOUR);
      busyUntil = end;
      intervals.push([start, end]);
      workOrders.push({ ...wo, unitCode: code, siteId: 'B', start, end, source: 'generator' });
    };

    for (let d = 0; d < days; d++) {
      const dayStart = from + d * DAY;

      // 1) PM jatuh tempo berdasarkan HM (kadang dikerjakan terlambat/terlalu awal)
      if (hm >= nextPmDue + pmOffset && busyUntil < dayStart + 20 * HOUR) {
        const pmType = pmTypeForHm(nextPmDue);
        const [min, max] = PM_DURATION[pmType];
        pmLogs.push({ unitCode: code, pmType, hmPlan: nextPmDue, hmActual: Math.round(hm) });
        addWorkOrder(
          { type: 'PM', component: PM_COMPONENT, problem: `Service ${pmType}`, delayReason: null, delayHours: 0, cost: random.between(3e6, 6e6) * (max / 6) },
          dayStart + 7 * HOUR,
          random.between(min, max),
        );
        nextPmDue += 250;
        pmOffset = random() < 0.15 ? random.between(30, 70) : random.between(-15, 20);
      }

      // 2) Breakdown tak terjadwal: peluang naik sebanding jam operasi hari itu
      const expectedOp = ewh * ((24 - overlapHours(intervals, dayStart, dayStart + DAY)) / 24);
      if (random() < 1 - Math.exp(-expectedOp / mtbf)) {
        const isAccident = random() < 0.04;
        const component = isAccident ? random.pick(['Attachment', 'Tyre', 'Electrical', 'Brake']) : weightedPick(random, COMPONENT_WEIGHTS);
        let repair = random.between(2, 10) + random() * random() * 30;
        let delayReason = null;
        let delayHours = 0;
        const r = random();
        if (isAccident) {
          delayReason = 'Investigasi insiden';
          delayHours = random.between(4, 24);
          repair += random.between(8, 30);
        } else if (r < 0.3) {
          delayReason = 'Menunggu part';
          delayHours = random.between(4, 48) + (random() < 0.15 ? random.between(24, 96) : 0);
        } else if (r < 0.42) {
          delayReason = 'Menunggu mekanik';
          delayHours = random.between(1, 6);
        } else if (r < 0.48) {
          delayReason = 'Menunggu tools';
          delayHours = random.between(1, 8);
        } else if (r < 0.52) {
          delayReason = 'Cuaca/akses jalan';
          delayHours = random.between(2, 10);
        }
        // Waktu respon: dari unit rusak sampai mekanik mulai menangani.
        // Shift malam (18.00–06.00) lebih lambat karena mekanik lebih sedikit.
        const breakdownAt = dayStart + random.between(6, 22) * HOUR;
        const hour = new Date(breakdownAt).getHours();
        const night = hour >= 18 || hour < 6;
        const responseHours = random.between(0.2, 1.5) + (night ? random.between(0.5, 2.5) : 0) + (random() < 0.06 ? random.between(3, 8) : 0);
        addWorkOrder(
          {
            type: isAccident ? 'BAC' : 'BM',
            component,
            problem: random.pick(COMPONENTS[component]),
            responseHours: Math.round(responseHours * 10) / 10,
            delayReason,
            delayHours: Math.round(delayHours * 10) / 10,
            cost: isAccident ? random.between(40e6, 250e6) : random.between(5e6, 45e6) + random() * random() * 120e6,
          },
          breakdownAt,
          responseHours + repair + delayHours,
        );
      }

      // 3) Corrective terencana dari temuan inspeksi (jarang)
      if (random() < expectedOp / 520) {
        const component = weightedPick(random, COMPONENT_WEIGHTS);
        addWorkOrder(
          { type: 'CM', component, problem: random.pick(COMPONENTS[component]), delayReason: null, delayHours: 0, cost: random.between(5e6, 30e6) },
          dayStart + 13 * HOUR,
          random.between(3, 10),
        );
      }

      // 4) Jam operasi hari ini → HM bertambah
      const down = overlapHours(intervals, dayStart, dayStart + DAY);
      hm += dailyOperatingHours(ewh, down, random);
      hmLogs.push({ unitCode: code, date: formatDate(dayStart), hm: Math.round(hm * 10) / 10 });
    }
  }

  // Urutkan, beri nomor WO, dan tentukan status akhir
  workOrders.sort((a, b) => a.start - b.start);
  const cutoffActive = periodEnd - 6 * DAY;
  const finished = workOrders.map((wo, i) => {
    const unscheduled = wo.type === 'BM' || wo.type === 'BAC';
    // WO yang melewati akhir periode, atau breakdown di 6 hari terakhir, masih berjalan
    const stillOpen = wo.end > periodEnd || (unscheduled && wo.start > cutoffActive);
    const waitingPart = wo.delayReason === 'Menunggu part' || i % 3 === 0;
    const status = !stillOpen ? 'Completed' : waitingPart ? 'Waiting Part' : 'In Progress';
    return {
      id: `WO-B-${String(i + 1).padStart(4, '0')}`,
      siteId: wo.siteId,
      unitCode: wo.unitCode,
      type: wo.type,
      status,
      start: formatDateTime(wo.start),
      end: stillOpen ? null : formatDateTime(wo.end),
      component: wo.component,
      problem: wo.problem,
      responseHours: wo.responseHours ?? null,
      delayReason: wo.delayReason,
      delayHours: wo.delayHours,
      cost: Math.round(wo.cost / 1000) * 1000,
      source: wo.source,
    };
  });

  return { units, workOrders: finished, hmLogs, pmLogs };
}

