// Koneksi ke database Supabase (PostgreSQL di cloud).
//
// Kunci "publishable" memang aman ditaruh di kode website: keamanan data diatur
// oleh aturan Row Level Security di supabase/schema.sql (siapa boleh baca/tulis).
// Nilai bawaan bisa diganti lewat file .env (lihat .env.example).

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ixtkfpyomcypcjoldldo.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_58WvXRFIzEcyK34SlZI5pw_xKtkAa3h';

let clientPromise = null;

// Library Supabase baru diunduh saat dibutuhkan, supaya halaman pertama tetap cepat
export function getClient() {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY));
  }
  return clientPromise;
}

// ---------- Penerjemah kolom: aplikasi (camelCase) ↔ database (snake_case) ----------

const ts = (value) => (value ? String(value).slice(0, 16) : null); // "2025-01-01T07:00:00" → "2025-01-01T07:00"

export const mapUnit = {
  fromDb: (r) => ({ code: r.code, siteId: r.site_id, type: r.type, brand: r.brand, model: r.model, pmInterval: r.pm_interval, ewh: Number(r.ewh) }),
  toDb: (u) => ({ code: u.code, site_id: u.siteId, type: u.type, brand: u.brand, model: u.model, pm_interval: u.pmInterval, ewh: u.ewh }),
};

export const mapWorkOrder = {
  fromDb: (r) => ({
    id: r.id,
    siteId: r.site_id,
    unitCode: r.unit_code,
    type: r.type,
    status: r.status,
    start: ts(r.start_at),
    end: ts(r.end_at),
    component: r.component,
    problem: r.problem,
    delayReason: r.delay_reason,
    delayHours: Number(r.delay_hours),
    cost: Number(r.cost),
    source: r.source,
  }),
  toDb: (w) => ({
    id: w.id,
    site_id: w.siteId,
    unit_code: w.unitCode,
    type: w.type,
    status: w.status,
    start_at: w.start,
    end_at: w.end,
    component: w.component,
    problem: w.problem,
    delay_reason: w.delayReason,
    delay_hours: w.delayHours ?? 0,
    cost: w.cost ?? 0,
    source: w.source ?? 'manual',
  }),
};

export const mapHm = {
  fromDb: (r) => ({ unitCode: r.unit_code, date: r.date, hm: Number(r.hm) }),
  toDb: (h) => ({ unit_code: h.unitCode, date: h.date, hm: h.hm }),
};

export const mapPm = {
  fromDb: (r) => ({ siteId: r.site_id, unitCode: r.unit_code, pmType: r.pm_type, hmPlan: Number(r.hm_plan), hmActual: Number(r.hm_actual) }),
  toDb: (p) => ({ site_id: p.siteId, unit_code: p.unitCode, pm_type: p.pmType, hm_plan: p.hmPlan, hm_actual: p.hmActual }),
};

// Pesan error yang lebih mudah dipahami
function explain(error) {
  const msg = error?.message ?? String(error);
  if (/relation .* does not exist|Could not find the table/i.test(msg)) return 'Tabel belum ada. Jalankan file supabase/schema.sql di SQL Editor Supabase.';
  if (/row-level security|permission denied/i.test(msg)) return 'Akses ditolak. Login dulu, atau aksi ini khusus Admin.';
  if (/duplicate key/i.test(msg)) return 'Data dengan kode/nomor yang sama sudah ada.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Tidak bisa terhubung ke Supabase. Periksa koneksi internet.';
  return msg;
}

async function run(query) {
  const { data, error } = await query;
  if (error) throw new Error(explain(error));
  return data;
}

// Ambil semua baris (Supabase membatasi 1000 baris per permintaan → ambil bertahap)
async function fetchAll(client, table, orderBy) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    // Urutan harus unik dan tetap supaya tidak ada baris yang terlewat antar halaman
    let query = client.from(table).select('*');
    for (const column of orderBy) query = query.order(column);
    const page = await run(query.range(from, from + pageSize - 1));
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

// Gagal bila server tidak menjawab dalam batas waktu
function withTimeout(promise, ms, message) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
}

export async function loadDatabase() {
  return withTimeout(loadDatabaseNow(), 15000, 'Supabase tidak merespons dalam 15 detik. Aplikasi memakai mode demo.');
}

async function loadDatabaseNow() {
  const client = await getClient();
  const [units, workOrders, hmLogs, pmLogs] = await Promise.all([
    fetchAll(client, 'units', ['code']),
    fetchAll(client, 'work_orders', ['id']),
    fetchAll(client, 'hm_logs', ['unit_code', 'date']),
    fetchAll(client, 'pm_logs', ['id']),
  ]);
  return {
    version: 2,
    units: units.map(mapUnit.fromDb),
    workOrders: workOrders.map(mapWorkOrder.fromDb),
    hmLogs: hmLogs.map(mapHm.fromDb),
    pmLogs: pmLogs.map(mapPm.fromDb),
  };
}

// ---------- Tulis data ----------

export async function insertWorkOrders(workOrders) {
  const client = await getClient();
  await run(client.from('work_orders').insert(workOrders.map(mapWorkOrder.toDb)));
}

export async function updateWorkOrder(id, changes) {
  const client = await getClient();
  const row = {};
  if ('status' in changes) row.status = changes.status;
  if ('end' in changes) row.end_at = changes.end;
  await run(client.from('work_orders').update(row).eq('id', id));
}

export async function insertUnit(unit) {
  const client = await getClient();
  await run(client.from('units').insert(mapUnit.toDb(unit)));
}

export async function upsertHmReading(reading) {
  const client = await getClient();
  await run(client.from('hm_logs').upsert(mapHm.toDb(reading), { onConflict: 'unit_code,date' }));
}

// Upload seluruh data demo ke database (khusus Admin, saat database masih kosong)
export async function seedDatabase(data, onProgress = () => {}) {
  const client = await getClient();
  const steps = [
    ['units', data.units.map(mapUnit.toDb)],
    ['work_orders', data.workOrders.map(mapWorkOrder.toDb)],
    ['hm_logs', data.hmLogs.map(mapHm.toDb)],
    ['pm_logs', data.pmLogs.map(mapPm.toDb)],
  ];
  const total = steps.reduce((sum, [, rows]) => sum + rows.length, 0);
  let done = 0;
  for (const [table, rows] of steps) {
    for (let i = 0; i < rows.length; i += 500) {
      await run(client.from(table).insert(rows.slice(i, i + 500)));
      done += Math.min(500, rows.length - i);
      onProgress(done / total, table);
    }
  }
}

// ---------- Login ----------

export async function getSession() {
  const client = await getClient();
  const { data } = await client.auth.getSession();
  return data.session;
}

export async function onAuthChange(callback) {
  const client = await getClient();
  const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email, password) {
  const client = await getClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(/Invalid login/i.test(error.message) ? 'Email atau password salah.' : error.message);
  return data.session;
}

export async function signOut() {
  const client = await getClient();
  await client.auth.signOut();
}

export async function fetchRole(userId) {
  const client = await getClient();
  const { data } = await client.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role ?? 'user';
}
