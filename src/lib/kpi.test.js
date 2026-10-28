import { describe, expect, it } from 'vitest';
import { breakdownTrend, componentPareto, delayAnalysis, downtimeHeatmap } from './analytics.js';
import { buildBuckets, buildHmIndex, calcKpi, hmAt, periodFromDates, toMs } from './kpi.js';
import { agingSummary, backlogItems, pmCompliance, pmForecast, unitConditions } from './planning.js';

const unit = { code: 'EX-001', siteId: 'A', type: 'Excavator', pmInterval: 250, ewh: 10 };
// Periode 10 hari = 240 jam kalender untuk 1 unit
const { from, to } = periodFromDates('2025-01-01', '2025-01-10');

function wo(overrides) {
  return {
    id: 'WO-TEST',
    siteId: 'A',
    unitCode: 'EX-001',
    type: 'BM',
    status: 'Completed',
    start: '2025-01-02T00:00',
    end: '2025-01-02T10:00',
    component: 'Engine',
    problem: 'Overheat',
    delayReason: null,
    delayHours: 0,
    cost: 1000,
    ...overrides,
  };
}

// HM naik 10 jam per hari, mulai 1000 di akhir 1 Jan
const hmLogs = Array.from({ length: 10 }, (_, i) => ({
  unitCode: 'EX-001',
  date: `2025-01-${String(i + 1).padStart(2, '0')}`,
  hm: 1000 + i * 10,
}));
const hmIndex = buildHmIndex(hmLogs);

describe('waktu & hour meter', () => {
  it('tanggal tanpa jam dibaca sebagai tengah malam waktu lokal', () => {
    expect(new Date(toMs('2025-03-01')).getHours()).toBe(0);
    expect(to - from).toBe(240 * 3600 * 1000);
  });

  it('HM diinterpolasi di antara dua pembacaan', () => {
    const series = hmIndex.get('EX-001');
    expect(hmAt(series, toMs('2025-01-03'))).toBe(1010); // akhir 2 Jan
    expect(hmAt(series, toMs('2025-01-03T12:00'))).toBe(1015);
  });
});

describe('calcKpi', () => {
  it('menghitung PA, MA, UA, MTBF, dan MTTR', () => {
    const workOrders = [
      wo({ id: 'A' }), // BM 10 jam
      wo({ id: 'B', type: 'PM', start: '2025-01-05T00:00', end: '2025-01-05T05:00' }), // PM 5 jam
    ];
    const kpi = calcKpi({ units: [unit], workOrders, hmIndex, from, to });
    expect(kpi.totalHours).toBe(240);
    expect(kpi.downtimeHours).toBe(15);
    expect(kpi.unscheduledDowntime).toBe(10);
    expect(kpi.scheduledDowntime).toBe(5);
    expect(kpi.operatingHours).toBe(100); // 10 hari × 10 jam
    expect(kpi.pa).toBeCloseTo((225 / 240) * 100);
    expect(kpi.ma).toBeCloseTo((100 / 115) * 100);
    expect(kpi.ua).toBeCloseTo((100 / 225) * 100);
    expect(kpi.mtbf).toBe(100); // 100 jam operasi / 1 breakdown
    expect(kpi.mttr).toBe(10);
    expect(kpi.cost).toBe(2000);
  });

  it('tidak menghitung downtime dua kali bila WO tumpang tindih', () => {
    const workOrders = [
      wo({ id: 'A', start: '2025-01-02T00:00', end: '2025-01-02T10:00' }),
      wo({ id: 'B', type: 'PM', start: '2025-01-02T05:00', end: '2025-01-02T12:00' }),
    ];
    expect(calcKpi({ units: [unit], workOrders, hmIndex, from, to }).downtimeHours).toBe(12);
  });

  it('WO yang belum selesai dihitung down sampai akhir periode dan masuk backlog', () => {
    const workOrders = [wo({ start: '2025-01-10T00:00', end: null, status: 'Waiting Part' })];
    const kpi = calcKpi({ units: [unit], workOrders, hmIndex, from, to });
    expect(kpi.downtimeHours).toBe(24);
    expect(kpi.backlog).toBe(1);
    expect(kpi.mttr).toBeNull();
  });

  it('BAC (accident) termasuk breakdown tak terjadwal', () => {
    const kpi = calcKpi({ units: [unit], workOrders: [wo({ type: 'BAC' })], hmIndex, from, to });
    expect(kpi.breakdownCount).toBe(1);
  });

  it('mengembalikan null bila tidak ada unit', () => {
    const kpi = calcKpi({ units: [], workOrders: [], hmIndex, from, to });
    expect(kpi.pa).toBeNull();
    expect(kpi.mtbf).toBeNull();
  });
});

describe('analytics', () => {
  it('bucket mingguan dan tren breakdown', () => {
    const buckets = buildBuckets(from, to, 'week');
    expect(buckets).toHaveLength(2);
    const trend = breakdownTrend({ units: [unit], workOrders: [wo(), wo({ type: 'PM', start: '2025-01-09T00:00', end: '2025-01-09T02:00' })], buckets });
    expect(trend[0]).toMatchObject({ unscheduled: 1, scheduled: 0 });
    expect(trend[1]).toMatchObject({ unscheduled: 0, scheduled: 1 });
  });

  it('pareto komponen hanya dari breakdown tak terjadwal', () => {
    const workOrders = [
      wo({ id: 'A', component: 'Engine' }),
      wo({ id: 'B', component: 'Hydraulic', start: '2025-01-03T00:00', end: '2025-01-03T20:00' }),
      wo({ id: 'C', type: 'PM', component: 'PM Service', start: '2025-01-04T00:00', end: '2025-01-04T08:00' }),
    ];
    const rows = componentPareto({ units: [unit], workOrders, from, to });
    expect(rows.map((r) => [r.name, r.value])).toEqual([
      ['Hydraulic', 20],
      ['Engine', 10],
    ]);
  });

  it('analisis delay menjumlahkan jam dan frekuensi', () => {
    const workOrders = [
      wo({ id: 'A', delayReason: 'Menunggu part', delayHours: 6 }),
      wo({ id: 'B', delayReason: 'Menunggu part', delayHours: 4 }),
      wo({ id: 'C', delayReason: 'Menunggu mekanik', delayHours: 1 }),
    ];
    expect(delayAnalysis({ units: [unit], workOrders, from, to })[0]).toMatchObject({ name: 'Menunggu part', value: 10, count: 2 });
  });

  it('heatmap menghitung rata-rata jam down per unit di tiap sel', () => {
    const buckets = buildBuckets(from, to, 'week');
    const { rows } = downtimeHeatmap({ units: [unit], workOrders: [wo()], buckets });
    expect(rows[0].cells).toEqual([10, 0]);
  });
});

describe('planning', () => {
  it('forecast PM memakai HM jadwal terakhir + interval', () => {
    const pmLogs = [{ unitCode: 'EX-001', pmType: 'PM250', hmPlan: 1000, hmActual: 1005 }];
    const [row] = pmForecast({ units: [unit], pmLogs, hmIndex, refTime: to });
    expect(row.due).toBe(1250);
    expect(row.remaining).toBe(1250 - 1090);
    expect(row.days).toBeCloseTo(16);
    expect(row.status).toBe('Terjadwal');
  });

  it('compliance PM dengan toleransi ±10% interval', () => {
    const pmLogs = [
      { unitCode: 'EX-001', pmType: 'PM250', hmPlan: 1000, hmActual: 1020 },
      { unitCode: 'EX-001', pmType: 'PM500', hmPlan: 1250, hmActual: 1290 },
    ];
    const result = pmCompliance({ units: [unit], pmLogs });
    expect(result.compliance).toBe(50);
    expect(result.rows[1].inTolerance).toBe(false);
  });

  it('aging backlog dikelompokkan per rentang hari', () => {
    const items = backlogItems(
      [wo({ status: 'Open', start: '2025-01-09T00:00' }), wo({ status: 'Open', start: '2024-09-01T00:00' }), wo()],
      to,
    );
    expect(items).toHaveLength(2);
    expect(agingSummary(items).map((b) => b.value)).toEqual([1, 0, 0, 1]);
  });
});

describe('kondisi unit (papan kerja)', () => {
  it('unit dengan breakdown aktif = B/D dan tampil paling atas', () => {
    const other = { ...unit, code: 'EX-002' };
    const rows = unitConditions({
      units: [other, unit],
      workOrders: [wo({ id: 'OPEN', start: '2025-01-09T00:00', end: null, status: 'In Progress', component: 'Engine' })],
      pmLogs: [],
      hmIndex,
      refTime: to,
    });
    expect(rows[0]).toMatchObject({ level: 'critical', reasons: ['Engine · In Progress'] });
    expect(rows[0].unit.code).toBe('EX-001');
    expect(rows[1]).toMatchObject({ level: 'good', active: null });
  });
});

describe('rincian waktu perbaikan & laporan mingguan', async () => {
  const { repairBreakdown } = await import('./analytics.js');
  const { isoWeek, listWeeks, weekStart, weeklyReport } = await import('./report.js');

  it('memecah durasi breakdown menjadi respon, menunggu, dan pengerjaan', () => {
    const workOrders = [
      wo({ id: 'A', responseHours: 1, delayHours: 3 }), // total 10 jam → 1 + 3 + 6
      wo({ id: 'B', responseHours: null }), // tidak tercatat → dikecualikan
    ];
    const r = repairBreakdown({ units: [unit], workOrders, from, to });
    expect(r.overall).toMatchObject({ count: 1, response: 1, waiting: 3, wrench: 6, total: 10 });
    expect(r.missing).toBe(1);
    expect(r.byType[0].name).toBe('Excavator');
  });

  it('respon + menunggu tidak pernah melebihi total durasi', () => {
    const r = repairBreakdown({ units: [unit], workOrders: [wo({ responseHours: 8, delayHours: 8 })], from, to });
    expect(r.overall).toMatchObject({ response: 8, waiting: 2, wrench: 0 });
  });

  it('minggu dimulai hari Senin dan bernomor ISO', () => {
    expect(new Date(weekStart(toMs('2025-01-09T10:00'))).getDay()).toBe(1);
    expect(isoWeek(toMs('2025-01-01'))).toBe(1);
    expect(isoWeek(toMs('2025-12-29'))).toBe(1); // 29 Des 2025 masuk minggu 1 tahun 2026
    expect(isoWeek(toMs('2025-12-28'))).toBe(52);
    const weeks = listWeeks(toMs('2025-01-01'), toMs('2025-01-20'));
    expect(weeks.map((w) => w.week)).toEqual([3, 2, 1]);
  });

  it('laporan mingguan membandingkan dengan minggu sebelumnya', () => {
    const start = toMs('2025-01-06');
    const end = start + 7 * 24 * 3600 * 1000;
    const workOrders = [wo({ id: 'A', start: '2025-01-07T00:00', end: '2025-01-07T10:00' })];
    const rep = weeklyReport({ units: [unit], workOrders, pmLogs: [], hmIndex, start, end, refTime: end });
    expect(rep.kpi.breakdownCount).toBe(1);
    expect(rep.prev.breakdownCount).toBe(0);
    expect(rep.topUnits[0]).toMatchObject({ hours: 10, main: 'Engine · Overheat' });
    expect(rep.insights.some((t) => t.includes('bertambah dari 0 menjadi 1'))).toBe(true);
  });
});
