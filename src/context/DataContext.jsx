// "Context" = tempat menyimpan data yang dipakai bersama oleh semua halaman.
// Halaman cukup memanggil useData() untuk membaca data atau menjalankan aksi
// (tambah WO, tutup WO, input HM, import CSV, ...), tanpa saling mengoper data.
//
// Ada dua sumber data:
//   • "database" — Supabase, data bersama untuk semua pengunjung (tulis perlu login)
//   • "local"    — demo di browser masing-masing pengunjung (localStorage)

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { buildSeedData } from '../data/seed.js';
import * as db from '../lib/database.js';
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

const loadLocalData = () => loadLocal() ?? buildSeedData();

export function DataProvider({ children }) {
  const [data, setData] = useState(loadLocalData);
  const [prefs, setPrefs] = useState(() => {
    const stored = loadPrefs();
    // Versi 3 memakai tema terang sebagai bawaan; preferensi tema lama tidak dipakai lagi
    const initial = { site: 'all', role: 'user', source: 'auto', ...stored, ...(stored.version === 3 ? {} : { theme: 'light' }), version: 3 };
    document.documentElement.dataset.theme = initial.theme;
    return initial;
  });
  // mode: 'local' | 'database' · status: 'checking' | 'ready' | 'empty' | 'error'
  const [source, setSource] = useState({ mode: 'local', status: prefs.source === 'local' ? 'ready' : 'checking', message: '' });
  const [session, setSession] = useState(null);
  const [dbRole, setDbRole] = useState(null);
  const [unit360, setUnit360] = useState(null); // kode unit yang sedang dibuka di panel Unit 360

  async function connectDatabase() {
    setSource((s) => ({ ...s, status: 'checking', message: '' }));
    try {
      const remote = await db.loadDatabase();
      if (remote.units.length === 0) {
        setSource({ mode: 'local', status: 'empty', message: 'Database terhubung tetapi masih kosong.' });
        return;
      }
      setData(remote);
      setSource({ mode: 'database', status: 'ready', message: '' });
    } catch (error) {
      setSource({ mode: 'local', status: 'error', message: error.message });
    }
  }

  // Saat aplikasi dibuka: coba hubungkan ke database, dan pantau status login
  useEffect(() => {
    let unsubscribe = () => {};
    if (prefs.source !== 'local') connectDatabase();
    db.getSession()
      .then(setSession)
      .catch(() => {});
    db.onAuthChange(setSession)
      .then((fn) => (unsubscribe = fn))
      .catch(() => {});
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!session) return setDbRole(null);
    db.fetchRole(session.user.id)
      .then(setDbRole)
      .catch(() => setDbRole('user'));
  }, [session]);

  useEffect(() => {
    if (source.mode === 'local') saveLocal(data);
  }, [data, source.mode]);
  useEffect(() => savePrefs(prefs), [prefs]);

  const isDatabase = source.mode === 'database';
  // Peran efektif: di mode database ditentukan akun login; di mode demo dipilih bebas
  const role = isDatabase ? (session ? (dbRole ?? 'user') : 'viewer') : prefs.role;
  const canWrite = !isDatabase || Boolean(session);

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

  function requireWrite(adminOnly = false) {
    if (!canWrite) throw new Error('Login dulu untuk menyimpan ke database (menu Database & Login).');
    if (adminOnly && role !== 'admin') throw new Error('Aksi ini khusus Admin.');
  }

  // Semua aksi bersifat async: di mode database, data disimpan ke Supabase dulu,
  // baru ditampilkan. Bila gagal, error dilempar dan ditampilkan oleh halaman.
  const actions = {
    async addWorkOrder(input) {
      requireWrite();
      const id = nextWorkOrderId(data.workOrders, input.start.slice(0, 4));
      const wo = { ...input, id, siteId: unitByCode.get(input.unitCode).siteId, source: input.source ?? 'manual' };
      if (isDatabase) await db.insertWorkOrders([wo]);
      setData((d) => ({ ...d, workOrders: [...d.workOrders, wo] }));
      return id;
    },
    async importWorkOrders(rows) {
      requireWrite();
      const added = [];
      for (const row of rows) {
        const id = nextWorkOrderId([...data.workOrders, ...added], row.start.slice(0, 4));
        added.push({ ...row, id, siteId: unitByCode.get(row.unitCode).siteId, source: 'csv' });
      }
      if (isDatabase) await db.insertWorkOrders(added);
      setData((d) => ({ ...d, workOrders: [...d.workOrders, ...added] }));
      return added.length;
    },
    async closeWorkOrder(id, end) {
      requireWrite();
      if (isDatabase) await db.updateWorkOrder(id, { end, status: 'Completed' });
      setData((d) => ({ ...d, workOrders: d.workOrders.map((wo) => (wo.id === id ? { ...wo, end, status: 'Completed' } : wo)) }));
    },
    async updateWorkOrderStatus(id, status) {
      requireWrite();
      if (isDatabase) await db.updateWorkOrder(id, { status });
      setData((d) => ({ ...d, workOrders: d.workOrders.map((wo) => (wo.id === id ? { ...wo, status } : wo)) }));
    },
    async addUnit(unit) {
      requireWrite(true);
      if (isDatabase) await db.insertUnit(unit);
      setData((d) => ({ ...d, units: [...d.units, unit] }));
    },
    async addHmReading(reading) {
      requireWrite();
      if (isDatabase) await db.upsertHmReading(reading);
      setData((d) => ({
        ...d,
        hmLogs: [...d.hmLogs.filter((h) => !(h.unitCode === reading.unitCode && h.date === reading.date)), reading],
      }));
    },
    resetDemo() {
      clearLocal();
      setData(buildSeedData());
    },
    // Pindah sumber data: 'database' atau 'local'
    async switchSource(mode) {
      setPrefs((p) => ({ ...p, source: mode === 'local' ? 'local' : 'auto' }));
      if (mode === 'database') return connectDatabase();
      setData(loadLocalData());
      setSource({ mode: 'local', status: 'ready', message: '' });
    },
    async seedDatabase(onProgress) {
      if (!session) throw new Error('Login dulu dengan akun Admin.');
      if (dbRole !== 'admin') throw new Error('Akun Anda belum Admin. Jalankan perintah "update public.profiles set role = \'admin\' …" di SQL Editor.');
      await db.seedDatabase(buildSeedData(), onProgress);
      await connectDatabase();
    },
    async signIn(email, password) {
      setSession(await db.signIn(email, password));
    },
    async signOut() {
      await db.signOut();
      setSession(null);
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
    source,
    session,
    dbRole,
    role,
    canWrite,
    unit360,
    ...actions,
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
