// Menggabungkan (compile) semua sumber data dummy menjadi satu dataset:
// - Site A: data mentah Excel dataset Power BI (src/data/site-a.json)
// - Site B: data dummy kontraktor tambang (src/data/siteB.js)
// Hasilnya dipakai sebagai data awal aplikasi / isi awal database.

import siteA from './site-a.json';
import { generateSiteB } from './siteB.js';
import { buildHmLogs, createRandom } from './simulate.js';

export const DATA_CUTOFF = '2025-12-31';
export const SITE_A_SOURCE = siteA.source;

export function buildSeedData() {
  const from = new Date(2025, 0, 1).getTime();
  const days = 365;
  const random = createRandom(11);

  // Site A tidak punya log HM harian di Excel → disimulasikan dari EWH & HM saat ini
  const unitsA = siteA.units.map(({ hmEnd, ...unit }) => unit);
  const hmLogsA = siteA.units.flatMap((unit) =>
    buildHmLogs({ unit, workOrders: siteA.workOrders, from, days, hmEnd: unit.hmEnd, random }),
  );

  const siteB = generateSiteB({ year: 2025 });

  return {
    version: 2,
    units: [...unitsA, ...siteB.units],
    workOrders: [...siteA.workOrders, ...siteB.workOrders],
    hmLogs: [...hmLogsA, ...siteB.hmLogs],
    pmLogs: [...siteA.pmLogs.map((log) => ({ ...log, siteId: 'A' })), ...siteB.pmLogs.map((log) => ({ ...log, siteId: 'B' }))],
  };
}

