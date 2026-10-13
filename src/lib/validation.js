// Aturan validasi data — dipakai bersama oleh form input dan import CSV,
// supaya data yang salah tidak pernah masuk (mirip cleaning di Power Query).

import { DELAY_REASONS, STATUSES, WO_TYPES } from '../data/catalog.js';
import { toMs } from './kpi.js';

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function validateWorkOrder(wo, unitByCode) {
  const errors = {};
  if (!unitByCode.has(wo.unitCode)) errors.unitCode = 'Unit tidak terdaftar.';
  if (!WO_TYPES[wo.type]) errors.type = `Jenis harus salah satu dari ${Object.keys(WO_TYPES).join('/')}.`;
  if (!STATUSES[wo.status]) errors.status = `Status harus salah satu dari ${Object.keys(STATUSES).join('/')}.`;
  if (!wo.component) errors.component = 'Pilih komponen.';
  if (!DATETIME.test(wo.start ?? '')) errors.start = 'Isi waktu mulai (format YYYY-MM-DDTHH:mm).';
  if (wo.end && !DATETIME.test(wo.end)) errors.end = 'Format waktu selesai YYYY-MM-DDTHH:mm.';
  else if (wo.end && wo.start && toMs(wo.end) <= toMs(wo.start)) errors.end = 'Waktu selesai harus setelah waktu mulai.';
  if (wo.status === 'Completed' && !wo.end) errors.end = 'WO Completed wajib punya waktu selesai.';
  if (wo.end && wo.status !== 'Completed') errors.status = 'WO yang sudah punya waktu selesai harus berstatus Completed.';
  if (wo.delayReason && !DELAY_REASONS.includes(wo.delayReason)) errors.delayReason = 'Alasan delay tidak dikenal.';
  if (!(Number(wo.delayHours) >= 0)) errors.delayHours = 'Jam delay 0 atau lebih.';
  if (wo.responseHours != null && !(Number(wo.responseHours) >= 0)) errors.responseHours = 'Waktu respon 0 atau lebih.';
  if (wo.end && wo.start && wo.responseHours != null && Number(wo.responseHours) + Number(wo.delayHours || 0) > (toMs(wo.end) - toMs(wo.start)) / 3600000) {
    errors.responseHours = 'Waktu respon + delay tidak boleh melebihi lama WO.';
  }
  if (!(Number(wo.cost) >= 0) || wo.cost === '') errors.cost = 'Biaya 0 atau lebih.';
  return errors;
}

// Ubah input mentah (teks dari form/CSV) menjadi objek WO yang rapi
export function normalizeWorkOrder(raw) {
  return {
    unitCode: String(raw.unitCode ?? '').trim().toUpperCase(),
    type: String(raw.type ?? '').trim().toUpperCase(),
    status: String(raw.status ?? '').trim() || (raw.end ? 'Completed' : 'Open'),
    start: String(raw.start ?? '').trim().replace(' ', 'T'),
    end: String(raw.end ?? '').trim().replace(' ', 'T') || null,
    component: String(raw.component ?? '').trim(),
    problem: String(raw.problem ?? '').trim() || null,
    responseHours: raw.responseHours === '' || raw.responseHours == null ? null : Number(raw.responseHours),
    delayReason: String(raw.delayReason ?? '').trim() || null,
    delayHours: raw.delayHours === '' || raw.delayHours == null ? 0 : Number(raw.delayHours),
    cost: raw.cost === '' || raw.cost == null ? '' : Number(raw.cost),
  };
}
