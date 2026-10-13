// "Context" = tempat menyimpan data yang dipakai bersama oleh semua halaman.
// Halaman cukup memanggil useData() untuk membaca data atau menjalankan aksi
// (tambah WO, tutup WO, input HM, import CSV, ...), tanpa saling mengoper data.

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { buildSeedData } from '../data/seed.js';
import { DAY, buildHmIndex, toMs } from '../lib/kpi.js';
import { clearLocal, loadLocal, loadPrefs, saveLocal, savePrefs } from '../lib/storage.js';

const DataContext = createContext(null);

// Nomor WO berikutnya untuk tahun tertentu, contoh: WO-2026-0001
function nextWorkOrderId(workOrders, year) {
  const prefix = `WO-${year}-`;
  const last = workOrders
    .filter((wo) => wo.id.startsWith(prefix))
    .reduce((max, wo) => Math.max(max, Number(wo.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(last + 1).padStart(4, '0')}`;
}

export function DataProvider({ children }) {
  const [data, setData] = useState(() => loadLocal() ?? buildSeedData());
  const [prefs, setPrefs] = useState(() => {
    const initial = { theme: 'dark', site: 'all', role: 'user', ...loadPrefs() };
    document.documentElement.dataset.theme = initial.theme;
    return initial;
  });
  const [unit360, setUnit360] = useState(null); // kode unit yang sedang dibuka di panel Unit 360

  useEffect(() => saveLocal(data), [data]);
  useEffect(() => savePrefs(prefs), [prefs]);

  const hmIndex = useMemo(() => buildHmIndex(data.hmLogs), [data.hmLogs]);

  // Unit & WO sesuai site yang dipilih di header
  const units = useMemo(
    () => (prefs.site === 'all' ? data.units : data.units.filter((u) => u.siteId === prefs.site)),
    [data.units, prefs.site],
  );
  const workOrders = useMemo(() => {
    const codes = new Set(units.map((u) => u.code));
    return data.workOrders.filter((wo) => codes.has(wo.unitCode));
  }, [data.workOrders, units]);

  // "Hari ini" versi data: akhir hari pembacaan HM / WO terakhir
  const refTime = useMemo(() => {
    const lastHm = data.hmLogs.reduce((max, log) => (log.date > max ? log.date : max), '');
    const lastWo = data.workOrders.reduce((max, wo) => (wo.start > max ? wo.start : max), '');
    return Math.max(lastHm ? toMs(lastHm) + DAY : 0, lastWo ? toMs(lastWo.slice(0, 10)) + DAY : 0);
  }, [data.hmLogs, data.workOrders]);

  const unitByCode = useMemo(() => new Map(data.units.map((u) => [u.code, u])), [data.units]);

  const actions = {
    addWorkOrder(input) {
      const id = nextWorkOrderId(data.workOrders, input.start.slice(0, 4));
      const unit = unitByCode.get(input.unitCode);
      setData((d) => ({
        ...d,
        workOrders: [...d.workOrders, { ...input, id, siteId: unit.siteId, source: input.source ?? 'manual' }],
      }));
      return id;
    },
    closeWorkOrder(id, end) {
      setData((d) => ({
        ...d,
        workOrders: d.workOrders.map((wo) => (wo.id === id ? { ...wo, end, status: 'Completed' } : wo)),
      }));
    },
    updateWorkOrderStatus(id, status) {
      setData((d) => ({ ...d, workOrders: d.workOrders.map((wo) => (wo.id === id ? { ...wo, status } : wo)) }));
    },
    importWorkOrders(rows) {
      setData((d) => {
        const added = [];
        for (const row of rows) {
          const id = nextWorkOrderId([...d.workOrders, ...added], row.start.slice(0, 4));
          added.push({ ...row, id, siteId: unitByCode.get(row.unitCode).siteId, source: 'csv' });
        }
        return { ...d, workOrders: [...d.workOrders, ...added] };
      });
    },
    addUnit(unit) {
      setData((d) => ({ ...d, units: [...d.units, unit] }));
    },
    addHmReading(reading) {
      setData((d) => ({
        ...d,
        hmLogs: [...d.hmLogs.filter((h) => !(h.unitCode === reading.unitCode && h.date === reading.date)), reading],
      }));
    },
    resetDemo() {
      clearLocal();
      setData(buildSeedData());
    },
    setPref(key, value) {
      // Tema dipasang langsung agar grafik membaca warna yang benar di render berikutnya
      if (key === 'theme') document.documentElement.dataset.theme = value;
      setPrefs((p) => ({ ...p, [key]: value }));
    },
    openUnit: setUnit360,
  };

  const value = {
    data,
    units,
    workOrders,
    hmIndex,
    refTime,
    unitByCode,
    prefs,
    unit360,
    ...actions,
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
