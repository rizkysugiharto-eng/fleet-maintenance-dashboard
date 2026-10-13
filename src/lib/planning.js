// Perencanaan PM berbasis HM, PM compliance, backlog, dan ringkasan per unit (Unit 360).

import { isUnscheduled, pmTypeForHm } from '../data/catalog.js';
import { DAY, calcKpi, clipToPeriod, hmAt, hoursBetween, toMs } from './kpi.js';

export const PM_TOLERANCE = 0.1; // PM dianggap tepat waktu bila deviasi HM ≤ ±10% interval

// HM terakhir dan rata-rata HM per hari (EWH) 30 hari terakhir
export function unitHmStatus(hmIndex, unitCode, refTime) {
  const series = hmIndex.get(unitCode);
  if (!series || series.length === 0) return { hm: null, ewh: null, lastUpdate: null };
  const last = series[series.length - 1];
  const t = Math.min(refTime, last.t);
  const ewh = (hmAt(series, t) - hmAt(series, t - 30 * DAY)) / 30;
  return { hm: last.hm, ewh, lastUpdate: last.t - DAY };
}

/**
 * Forecast PM: kapan setiap unit jatuh tempo PM berikutnya.
 * HM jatuh tempo = HM jadwal PM terakhir + interval.
 * Estimasi hari = sisa HM ÷ EWH (rata-rata HM per hari).
 */
export function pmForecast({ units, pmLogs, hmIndex, refTime }) {
  return units
    .filter((u) => u.pmInterval)
    .map((u) => {
      const { hm, ewh } = unitHmStatus(hmIndex, u.code, refTime);
      const plans = pmLogs.filter((log) => log.unitCode === u.code).map((log) => log.hmPlan);
      const due = plans.length ? Math.max(...plans) + u.pmInterval : Math.ceil((hm ?? 0) / u.pmInterval) * u.pmInterval;
      const remaining = hm == null ? null : due - hm;
      const days = remaining != null && ewh > 0 ? remaining / ewh : null;
      const tolerance = u.pmInterval * PM_TOLERANCE;
      let status = 'Terjadwal';
      if (remaining != null && remaining < -tolerance) status = 'Terlambat';
      else if (remaining != null && remaining < 0) status = 'Jatuh tempo';
      else if (days != null && days <= 7) status = 'Minggu ini';
      else if (days != null && days <= 14) status = 'Minggu depan';
      return {
        unit: u,
        hm,
        ewh,
        due,
        pmType: pmTypeForHm(due),
        remaining,
        days,
        estDate: days != null ? refTime + Math.max(0, days) * DAY : null,
        status,
      };
    })
    .sort((a, b) => (a.remaining ?? Infinity) - (b.remaining ?? Infinity));
}

export const PM_STATUS_LEVEL = {
  Terlambat: 'critical',
  'Jatuh tempo': 'serious',
  'Minggu ini': 'warning',
  'Minggu depan': 'neutral',
  Terjadwal: 'good',
};

// PM Schedule Compliance: apakah PM dikerjakan pada HM yang sesuai jadwal
export function pmCompliance({ units, pmLogs }) {
  const intervalOf = new Map(units.map((u) => [u.code, u.pmInterval]));
  const rows = pmLogs
    .filter((log) => intervalOf.has(log.unitCode))
    .map((log) => {
      const interval = intervalOf.get(log.unitCode);
      const deviation = log.hmActual - log.hmPlan;
      return { ...log, deviation, deviationPct: deviation / interval, inTolerance: Math.abs(deviation) <= interval * PM_TOLERANCE };
    });
  const compliant = rows.filter((r) => r.inTolerance).length;
  return { rows, compliance: rows.length ? (compliant / rows.length) * 100 : null, compliant, total: rows.length };
}

// PM Completion Rate: berapa % WO PM yang sudah selesai
export function pmCompletionRate(workOrders) {
  const pm = workOrders.filter((wo) => wo.type === 'PM');
  return pm.length ? (pm.filter((wo) => wo.status === 'Completed').length / pm.length) * 100 : null;
}

// ---------- Backlog ----------

export const AGING_BUCKETS = [
  { label: '0–7 hari', max: 7 },
  { label: '8–30 hari', max: 30 },
  { label: '31–90 hari', max: 90 },
  { label: '> 90 hari', max: Infinity },
];

export function backlogItems(workOrders, refTime) {
  return workOrders
    .filter((wo) => wo.status !== 'Completed')
    .map((wo) => ({ ...wo, ageDays: Math.max(0, Math.floor((refTime - toMs(wo.start)) / DAY)) }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

export function agingSummary(items) {
  let lower = -1;
  return AGING_BUCKETS.map((bucket) => {
    const count = items.filter((it) => it.ageDays > lower && it.ageDays <= bucket.max).length;
    lower = bucket.max;
    return { name: bucket.label, value: count };
  });
}

// ---------- Unit 360 ----------

export function unitSummary({ unit, workOrders, pmLogs, hmIndex, from, to, refTime }) {
  const wos = workOrders.filter((wo) => wo.unitCode === unit.code);
  const inPeriod = wos.filter((wo) => clipToPeriod(wo, from, to));
  const breakdowns = inPeriod.filter((wo) => isUnscheduled(wo.type)).sort((a, b) => a.start.localeCompare(b.start));

  // Repeat breakdown: komponen yang sama rusak lagi dalam 30 hari
  let repeats = 0;
  breakdowns.forEach((wo, i) => {
    const prev = breakdowns
      .slice(0, i)
      .reverse()
      .find((p) => p.component && p.component === wo.component);
    if (prev && toMs(wo.start) - toMs(prev.start) <= 30 * DAY) repeats += 1;
  });

  const componentCount = new Map();
  for (const wo of breakdowns) {
    const key = [wo.component, wo.problem].filter(Boolean).join(' | ') || 'Tidak tercatat';
    componentCount.set(key, (componentCount.get(key) ?? 0) + 1);
  }

  const forecast = pmForecast({ units: [unit], pmLogs, hmIndex, refTime })[0];
  const kpi = calcKpi({ units: [unit], workOrders, hmIndex, from, to });

  return {
    hmStatus: unitHmStatus(hmIndex, unit.code, refTime),
    activeBreakdown: wos.find((wo) => !wo.end && isUnscheduled(wo.type)) ?? null,
    openBacklog: wos.filter((wo) => wo.status !== 'Completed').length,
    downtimeHours: kpi.downtimeHours,
    unscheduledCount: breakdowns.length,
    scheduledCount: inPeriod.filter((wo) => !isUnscheduled(wo.type)).length,
    repeatRate: breakdowns.length ? (repeats / breakdowns.length) * 100 : null,
    repeats,
    forecast,
    kpi,
    topComponents: [...componentCount].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6),
    history: [...wos].sort((a, b) => b.start.localeCompare(a.start)),
    durationOf: (wo) => (wo.end ? hoursBetween(toMs(wo.start), toMs(wo.end)) : null),
  };
}
