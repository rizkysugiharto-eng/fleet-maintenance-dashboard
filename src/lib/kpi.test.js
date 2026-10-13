import { describe, expect, it } from 'vitest';
import {
  breakdownByComponent,
  calcKpi,
  listMonths,
  monthStart,
  monthlyPa,
  parseTime,
} from './kpi.js';

const unit = { code: 'EX-001', type: 'Excavator', brand: 'Komatsu', model: 'PC2000-8' };
// Periode 10 hari = 240 jam kalender untuk 1 unit
const from = parseTime('2025-01-01T00:00');
const to = parseTime('2025-01-11T00:00');

function wo(overrides) {
  return {
    id: 'WO-TEST',
    unitCode: 'EX-001',
    type: 'BM',
    component: 'Engine',
    description: 'Test',
    start: '2025-01-02T00:00',
    end: '2025-01-02T10:00',
    status: 'Closed',
    cost: 1000,
    ...overrides,
  };
}

describe('calcKpi', () => {
  it('menghitung PA, MTBF, dan MTTR dasar', () => {
    const workOrders = [
      wo({ id: 'A' }), // BM 10 jam
      wo({ id: 'B', type: 'PM', start: '2025-01-05T00:00', end: '2025-01-05T05:00' }), // PM 5 jam
    ];
    const kpi = calcKpi({ units: [unit], workOrders, from, to });
    expect(kpi.calendarHours).toBe(240);
    expect(kpi.downtimeHours).toBe(15);
    expect(kpi.pa).toBeCloseTo((225 / 240) * 100);
    expect(kpi.mtbf).toBe(225); // 225 jam operasi / 1 breakdown
    expect(kpi.mttr).toBe(10);
    expect(kpi.woCount).toBe(2);
    expect(kpi.cost).toBe(2000);
  });

  it('tidak menghitung downtime dua kali bila WO tumpang tindih', () => {
    const workOrders = [
      wo({ id: 'A', start: '2025-01-02T00:00', end: '2025-01-02T10:00' }),
      wo({ id: 'B', type: 'PM', start: '2025-01-02T05:00', end: '2025-01-02T12:00' }),
    ];
    const kpi = calcKpi({ units: [unit], workOrders, from, to });
    expect(kpi.downtimeHours).toBe(12);
  });

  it('WO Open dihitung down sampai akhir periode dan masuk backlog', () => {
    const workOrders = [wo({ start: '2025-01-10T00:00', end: null, status: 'Open' })];
    const kpi = calcKpi({ units: [unit], workOrders, from, to });
    expect(kpi.downtimeHours).toBe(24);
    expect(kpi.backlog).toBe(1);
    expect(kpi.mttr).toBeNull(); // belum ada BM yang selesai
  });

  it('memotong WO yang melewati batas periode', () => {
    const workOrders = [wo({ start: '2024-12-31T20:00', end: '2025-01-01T04:00' })];
    const kpi = calcKpi({ units: [unit], workOrders, from, to });
    expect(kpi.downtimeHours).toBe(4);
    expect(kpi.woCount).toBe(0); // WO dimulai sebelum periode
  });

  it('mengembalikan null bila tidak ada unit atau breakdown', () => {
    const kpi = calcKpi({ units: [], workOrders: [], from, to });
    expect(kpi.pa).toBeNull();
    expect(kpi.mtbf).toBeNull();
  });
});

describe('ringkasan', () => {
  it('listMonths melewati pergantian tahun', () => {
    expect(listMonths('2024-11', '2025-02')).toEqual(['2024-11', '2024-12', '2025-01', '2025-02']);
  });

  it('monthlyPa memberi satu baris per bulan', () => {
    const rows = monthlyPa({ units: [unit], workOrders: [wo()], fromMonth: '2025-01', toMonth: '2025-02' });
    expect(rows.map((r) => r.name)).toEqual(['2025-01', '2025-02']);
    expect(rows[1].value).toBe(100);
    expect(monthStart('2025-02')).toBe(parseTime('2025-02-01T00:00'));
  });

  it('pareto komponen hanya dari BM dan urut terbesar', () => {
    const workOrders = [
      wo({ id: 'A', component: 'Engine' }), // 10 jam
      wo({ id: 'B', component: 'Hydraulic', start: '2025-01-03T00:00', end: '2025-01-03T20:00' }), // 20 jam
      wo({ id: 'C', type: 'PM', component: 'PM Service', start: '2025-01-04T00:00', end: '2025-01-04T08:00' }),
    ];
    const rows = breakdownByComponent({ units: [unit], workOrders, from, to });
    expect(rows).toEqual([
      { name: 'Hydraulic', value: 20 },
      { name: 'Engine', value: 10 },
    ]);
  });
});
