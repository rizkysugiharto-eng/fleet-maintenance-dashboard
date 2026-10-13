// Lapisan penyimpanan data (data layer).
//
// Tahap 1 (sekarang): data disimpan di localStorage browser, jadi tiap
// pengunjung punya salinan data demonya sendiri.
// Tahap 2: file inilah yang diganti untuk membaca/menulis ke database
// (Supabase). Halaman-halaman lain tidak perlu diubah.

import { generateDummyData } from '../data/dummy.js';

const STORAGE_KEY = 'fleet-maintenance-dashboard:v1';

function isValid(data) {
  return data && Array.isArray(data.units) && Array.isArray(data.workOrders);
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (isValid(data)) return data;
    }
  } catch {
    // localStorage bisa diblokir (mode private) → pakai data dummy
  }
  return generateDummyData();
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Gagal simpan tidak menghentikan aplikasi; data tetap ada selama tab terbuka
  }
}

export function resetData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // abaikan
  }
  return generateDummyData();
}
