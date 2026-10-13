// Laporan mingguan: KPI minggu ini vs minggu lalu, unit bermasalah, backlog, PM,
// dan kesimpulan otomatis dalam kalimat sederhana.

import { componentPareto, repairBreakdown } from './analytics.js';
import { formatNumber, formatPercent } from './format.js';
import { DAY, calcKpi, clipToPeriod, filterByUnits, hoursBetween, startedIn, toMs } from './kpi.js';
import { backlogItems, pmForecast } from './planning.js';

// Senin 00:00 pada minggu yang memuat waktu t
export function weekStart(t) {
  const d = new Date(t);
  const day = (d.getDay() + 6) % 7; // Senin = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
}

// Nomor minggu ISO-8601: minggu pertama adalah minggu yang memuat hari Kamis pertama tahun itu
export function isoWeek(t) {
  const local = new Date(t);
  const d = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  const dayNum = d.getUTCDay() || 7; // Minggu = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // geser ke hari Kamis di minggu yang sama
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / DAY + 1) / 7);
}

// Daftar minggu lengkap (Senin–Minggu) yang sudah berakhir sebelum `to`, terbaru dulu
export function listWeeks(from, to) {
  const weeks = [];
  for (let start = weekStart(to) - 7 * DAY; start + 7 * DAY > from; start -= 7 * DAY) {
    weeks.push({ start, end: start + 7 * DAY, week: isoWeek(start), year: new Date(start + 3 * DAY).getFullYear() });
  }
  return weeks;
}

export function weeklyReport({ units, workOrders, pmLogs, hmIndex, start, end, refTime }) {
  const args = { units, workOrders, hmIndex, from: start, to: end };
  const kpi = calcKpi(args);
  const prev = calcKpi({ ...args, from: start - 7 * DAY, to: start });
  const wos = filterByUnits(workOrders, units);

  // Unit dengan downtime terlama minggu ini
  const topUnits = units
    .map((u) => {
      const own = wos.filter((wo) => wo.unitCode === u.code && clipToPeriod(wo, start, end));
      const hours = own.reduce((s, wo) => {
        const c = clipToPeriod(wo, start, end);
        return s + hoursBetween(c[0], c[1]);
      }, 0);
      const main = own.filter((wo) => wo.component).sort((a, b) => toMs(b.end ?? end) - toMs(b.start) - (toMs(a.end ?? end) - toMs(a.start)))[0];
      return { unit: u, hours, woCount: own.length, main: main ? `${main.component}${main.problem ? ` · ${main.problem}` : ''}` : '–' };
    })
    .filter((r) => r.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  const pareto = componentPareto(args).slice(0, 5);
  const paretoTotal = componentPareto(args).reduce((s, r) => s + r.value, 0);
  const repair = repairBreakdown(args);

  const openAtEnd = backlogItems(
    wos.filter((wo) => toMs(wo.start) < end && (!wo.end || toMs(wo.end) > end) && wo.status !== 'Completed'),
    end,
  );
  const backlog = {
    open: openAtEnd.length,
    old: openAtEnd.filter((b) => b.ageDays > 90).length,
    created: wos.filter((wo) => startedIn(wo, start, end)).length,
    closed: wos.filter((wo) => wo.end && toMs(wo.end) >= start && toMs(wo.end) < end).length,
  };

  // Jadwal PM hanya relevan untuk minggu terakhir (memakai HM terbaru)
  const isLatest = end >= weekStart(refTime);
  const pmNext = isLatest
    ? pmForecast({ units, pmLogs, hmIndex, refTime }).filter((f) => f.days != null && f.days <= 14)
    : [];

  return { kpi, prev, topUnits, pareto, paretoTotal, repair, backlog, pmNext, isLatest, insights: buildInsights({ kpi, prev, topUnits, pareto, paretoTotal, repair, backlog }) };
}

// Kesimpulan otomatis dalam kalimat sederhana (bahan diskusi rapat mingguan)
function buildInsights({ kpi, prev, topUnits, pareto, paretoTotal, repair, backlog }) {
  const notes = [];
  if (kpi.pa != null && prev.pa != null) {
    const diff = kpi.pa - prev.pa;
    notes.push(
      Math.abs(diff) < 0.5
        ? `PA stabil di ${formatPercent(kpi.pa)} (minggu lalu ${formatPercent(prev.pa)}).`
        : `PA ${diff > 0 ? 'naik' : 'turun'} ${formatNumber(Math.abs(diff), 1)} poin: ${formatPercent(prev.pa)} → ${formatPercent(kpi.pa)}.`,
    );
  }
  if (kpi.breakdownCount !== prev.breakdownCount) {
    notes.push(`Jumlah breakdown ${kpi.breakdownCount > prev.breakdownCount ? 'bertambah' : 'berkurang'} dari ${prev.breakdownCount} menjadi ${kpi.breakdownCount} kejadian.`);
  }
  if (topUnits[0]) {
    notes.push(`Unit paling lama down: ${topUnits[0].unit.code} (${formatNumber(topUnits[0].hours)} jam, penyebab utama ${topUnits[0].main}).`);
  }
  if (pareto[0] && paretoTotal > 0) {
    notes.push(`Komponen ${pareto[0].name} menyumbang ${formatPercent((pareto[0].value / paretoTotal) * 100)} jam breakdown minggu ini.`);
  }
  const r = repair.overall;
  if (r.count > 0 && r.total > 0) {
    const parts = [
      ['menunggu (part/tools/dll.)', r.waiting],
      ['respon mekanik', r.response],
      ['pengerjaan', r.wrench],
    ].sort((a, b) => b[1] - a[1]);
    notes.push(`Dari rata-rata ${formatNumber(r.total, 1)} jam perbaikan, porsi terbesar adalah ${parts[0][0]} (${formatPercent((parts[0][1] / r.total) * 100)}).`);
  }
  notes.push(
    backlog.created > backlog.closed
      ? `Backlog bertambah: ${backlog.created} WO baru, ${backlog.closed} selesai. ${backlog.open} WO masih terbuka.`
      : `Backlog terkendali: ${backlog.closed} WO selesai, ${backlog.created} WO baru. ${backlog.open} WO masih terbuka.`,
  );
  return notes;
}
