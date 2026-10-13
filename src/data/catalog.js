// Daftar kode & istilah yang dipakai di seluruh aplikasi (seperti tabel master).

export const SITES = [
  { id: 'A', name: 'Site A', description: 'Dataset Power BI (Excel)' },
  { id: 'B', name: 'Site B', description: 'Kontraktor tambang (dummy)' },
];

// Jenis work order. "group" menentukan terjadwal (planned) atau tidak (unplanned).
// Padanan istilah tambang: PM = B/S (breakdown schedule), BM = B/U (breakdown unschedule).
export const WO_TYPES = {
  PM: { label: 'Preventive Maintenance', group: 'scheduled', hint: 'Servis berkala terjadwal (B/S)' },
  CM: { label: 'Corrective Maintenance', group: 'scheduled', hint: 'Perbaikan terencana dari temuan inspeksi' },
  BM: { label: 'Breakdown Maintenance', group: 'unscheduled', hint: 'Rusak mendadak saat operasi (B/U)' },
  BAC: { label: 'Breakdown Accident', group: 'unscheduled', hint: 'Rusak karena insiden/kecelakaan' },
};

export const isUnscheduled = (type) => WO_TYPES[type]?.group === 'unscheduled';

export const STATUSES = {
  Open: { label: 'Open', hint: 'Belum dikerjakan' },
  'In Progress': { label: 'In Progress', hint: 'Sedang dikerjakan' },
  'Waiting Part': { label: 'Waiting Part', hint: 'Menunggu suku cadang' },
  Completed: { label: 'Completed', hint: 'Selesai, unit ready' },
};

export const DELAY_REASONS = [
  'Menunggu part',
  'Menunggu mekanik',
  'Menunggu tools',
  'Investigasi insiden',
  'Cuaca/akses jalan',
];

export const UNIT_TYPES = [
  'Excavator',
  'Dump Truck',
  'Bulldozer',
  'Grader',
  'Water Truck',
  'Fuel Truck',
  'Light Vehicle',
  'Wheel Loader',
];

// Komponen dan jenis kerusakan yang umum per komponen
export const COMPONENTS = {
  Engine: ['Low power', 'Overheat', 'Oil leak', 'Tidak bisa start'],
  Hydraulic: ['Hose bocor', 'Pressure drop', 'Pump abnormal'],
  Transmission: ['Oil leak', 'Gear slip', 'Bunyi abnormal'],
  Undercarriage: ['Track shoe patah', 'Roller aus'],
  Electrical: ['Error controller', 'Wiring putus', 'Lampu mati'],
  Brake: ['Rem tidak pakem', 'Brake overheat'],
  'Final Drive': ['Bunyi abnormal', 'Oil leak'],
  Tyre: ['Ban sobek', 'Tekanan angin rendah'],
  'Cooling System': ['Radiator bocor', 'Fan belt putus'],
  Attachment: ['Bucket teeth patah', 'Cutting edge aus'],
};

export const PM_COMPONENT = 'PM Service';

// Jenis PM berdasarkan kelipatan HM (contoh siklus 250 jam)
export function pmTypeForHm(hm) {
  if (hm % 1000 === 0) return 'PM1000';
  if (hm % 500 === 0) return 'PM500';
  return 'PM250';
}
