// Penyimpanan lokal di browser (localStorage).
// Dipakai sebagai "mode demo": setiap pengunjung punya salinan datanya sendiri.
// Mode database (Supabase) ada di src/lib/database.js.

const STORAGE_KEY = 'fleet-maintenance-dashboard:v3'; // v3: WO punya waktu respon
const PREFS_KEY = 'fleet-maintenance-dashboard:prefs';

function isValid(data) {
  return data && data.version === 3 && ['units', 'workOrders', 'hmLogs', 'pmLogs'].every((k) => Array.isArray(data[k]));
}

export function loadLocal() {
  try {
    localStorage.removeItem('fleet-maintenance-dashboard:v2'); // bersihkan data versi lama (±1 MB)
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw && JSON.parse(raw);
    return isValid(data) ? data : null;
  } catch {
    return null; // localStorage bisa diblokir (mode private)
  }
}

export function saveLocal(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Gagal simpan tidak menghentikan aplikasi; data tetap ada selama tab terbuka
  }
}

export function clearLocal() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // abaikan
  }
}

// Preferensi tampilan (tema, site terpilih)
export function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // abaikan
  }
}
