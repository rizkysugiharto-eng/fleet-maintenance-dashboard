// Tabel ringkasan untuk grafik dashboard (seperti visual di Power BI).

import { WO_TYPES, isUnscheduled } from '../data/catalog.js';
import { calcKpi, clipToPeriod, filterByUnits, hoursBetween, startedIn, toMs } from './kpi.js';

// Jumlahkan nilai per kelompok, urut dari terbesar
function sumBy(items, keyOf, valueOf) {
  const totals = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (key == null) continue;
    const entry = totals.get(key) ?? { name: key, value: 0, count: 0 };
    entry.value += valueOf(item);
    entry.count += 1;
    totals.set(key, entry);
  }
  return [...totals.values()].sort((a, b) => b.value - a.value);
}

const clippedHours = (from, to) => (wo) => {
  const c = clipToPeriod(wo, from, to);
  return c ? hoursBetween(c[0], c[1]) : 0;
};

// Jumlah breakdown terjadwal vs tak terjadwal per bucket waktu
export function breakdownTrend({ units, workOrders, buckets }) {
  const wos = filterByUnits(workOrders, units);
  return buckets.map((b) => {
    const started = wos.filter((wo) => startedIn(wo, b.start, b.end));
    return {
      name: b.label,
      unscheduled: started.filter((wo) => isUnscheduled(wo.type)).length,
      scheduled: started.filter((wo) => !isUnscheduled(wo.type)).length,
    };
  });
}

export function downtimeByType({ units, workOrders, from, to }) {
  const wos = filterByUnits(workOrders, units).filter((wo) => clipToPeriod(wo, from, to));
  return sumBy(wos, (wo) => wo.type, clippedHours(from, to)).map((r) => ({
    ...r,
    label: `${r.name} · ${WO_TYPES[r.name]?.label ?? r.name}`,
  }));
}

// Downtime terjadwal vs tak terjadwal (planned vs unplanned)
export function downtimeSplit({ units, workOrders, from, to }) {
  const rows = downtimeByType({ units, workOrders, from, to });
  const unplanned = rows.filter((r) => isUnscheduled(r.name)).reduce((s, r) => s + r.value, 0);
  const planned = rows.filter((r) => !isUnscheduled(r.name)).reduce((s, r) => s + r.value, 0);
  return { planned, unplanned, total: planned + unplanned };
}

// Analisis delay: alasan keterlambatan perbaikan (jam & frekuensi)
export function delayAnalysis({ units, workOrders, from, to }) {
  const wos = filterByUnits(workOrders, units).filter((wo) => startedIn(wo, from, to) && wo.delayReason);
  return sumBy(wos, (wo) => wo.delayReason, (wo) => wo.delayHours || 0);
}

export const STATUS_ORDER = ['Completed', 'In Progress', 'Waiting Part', 'Open'];

export function statusSummary({ units, workOrders, from, to }) {
  const wos = filterByUnits(workOrders, units).filter((wo) => toMs(wo.start) < to && (startedIn(wo, from, to) || wo.status !== 'Completed'));
  return STATUS_ORDER.map((status) => ({ name: status, value: wos.filter((wo) => wo.status === status).length }));
}

// Pareto: komponen penyebab downtime breakdown tak terjadwal
export function componentPareto({ units, workOrders, from, to }) {
  const wos = filterByUnits(workOrders, units).filter((wo) => isUnscheduled(wo.type) && wo.component && clipToPeriod(wo, from, to));
  return sumBy(wos, (wo) => wo.component, clippedHours(from, to));
}

export function paByUnit({ units, workOrders, hmIndex, from, to }) {
  return units
    .map((u) => ({ name: u.code, value: calcKpi({ units: [u], workOrders, hmIndex, from, to }).pa }))
    .sort((a, b) => a.value - b.value);
}

export function costByUnit({ units, workOrders, from, to }) {
  const wos = filterByUnits(workOrders, units).filter((wo) => startedIn(wo, from, to));
  return sumBy(wos, (wo) => wo.unitCode, (wo) => wo.cost || 0);
}

// Ringkasan per tipe unit (tabel seperti laporan mingguan)
export function typeSummary({ units, workOrders, hmIndex, from, to }) {
  const types = [...new Set(units.map((u) => u.type))];
  return types
    .map((type) => {
      const group = units.filter((u) => u.type === type);
      return { name: type, unitCount: group.length, ...calcKpi({ units: group, workOrders, hmIndex, from, to }) };
    })
    .sort((a, b) => b.downtimeHours - a.downtimeHours);
}

/**
 * Heatmap: baris = tipe unit (atau unit), kolom = bucket waktu,
 * nilai = rata-rata jam down per unit di sel tersebut.
 */
export function downtimeHeatmap({ units, workOrders, buckets, rowKey = 'type' }) {
  const rowNames = [...new Set(units.map((u) => (rowKey === 'type' ? u.type : u.code)))].sort();
  const unitRow = new Map(units.map((u) => [u.code, rowKey === 'type' ? u.type : u.code]));
  const unitCount = new Map(rowNames.map((r) => [r, units.filter((u) => unitRow.get(u.code) === r).length]));
  const grid = new Map(rowNames.map((r) => [r, buckets.map(() => 0)]));
  const wos = filterByUnits(workOrders, units);

  for (const wo of wos) {
    const row = grid.get(unitRow.get(wo.unitCode));
    buckets.forEach((b, i) => {
      const c = clipToPeriod(wo, b.start, b.end);
      if (c) row[i] += hoursBetween(c[0], c[1]);
    });
  }
  const rows = rowNames.map((name) => ({
    name,
    unitCount: unitCount.get(name),
    cells: grid.get(name).map((hours) => hours / unitCount.get(name)),
  }));
  const max = Math.max(1, ...rows.flatMap((r) => r.cells));
  return { rows, max };
}

// Daftar WO yang menyebabkan downtime di satu sel heatmap (untuk drilldown)
export function heatmapCellWorkOrders({ units, workOrders, rowName, rowKey = 'type', bucket }) {
  const codes = new Set(units.filter((u) => (rowKey === 'type' ? u.type : u.code) === rowName).map((u) => u.code));
  return workOrders
    .filter((wo) => codes.has(wo.unitCode) && clipToPeriod(wo, bucket.start, bucket.end))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Rincian waktu perbaikan breakdown (MTTR dipecah 3 bagian):
 *   respon     = unit rusak → mekanik mulai menangani
 *   menunggu   = tertunda karena part, tools, cuaca, dll. (delayHours)
 *   pengerjaan = sisa waktu = jam kerja mekanik yang sebenarnya
 * Hanya WO breakdown yang sudah selesai dan mencatat waktu respon.
 */
export function repairBreakdown({ units, workOrders, from, to }) {
  const done = filterByUnits(workOrders, units).filter((wo) => isUnscheduled(wo.type) && wo.end && startedIn(wo, from, to));
  const recorded = done.filter((wo) => wo.responseHours != null);

  const parts = recorded.map((wo) => {
    const total = hoursBetween(toMs(wo.start), toMs(wo.end));
    const response = Math.min(wo.responseHours, total);
    const waiting = Math.min(wo.delayHours || 0, total - response);
    return { wo, total, response, waiting, wrench: total - response - waiting };
  });

  const average = (items) => {
    const n = items.length || 1;
    const sum = (key) => items.reduce((s, p) => s + p[key], 0) / n;
    return { count: items.length, response: sum('response'), waiting: sum('waiting'), wrench: sum('wrench'), total: sum('total') };
  };

  const unitType = new Map(units.map((u) => [u.code, u.type]));
  const types = [...new Set(parts.map((p) => unitType.get(p.wo.unitCode)))];
  const byType = types
    .map((type) => ({ name: type, ...average(parts.filter((p) => unitType.get(p.wo.unitCode) === type)) }))
    .sort((a, b) => b.total - a.total);

  return { overall: average(parts), byType, missing: done.length - recorded.length };
}
