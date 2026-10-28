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

// Kamus istilah lapangan untuk pengunjung awam (kotak sambutan di Briefing Pagi,
// tombol "?" di KPI, dan keterangan saat kursor diarahkan ke tag status).
export const GLOSSARY = {
  BD: { term: 'B/D', text: 'Breakdown: unit rusak dan tidak boleh dioperasikan sampai selesai diperbaiki.' },
  CEK: { term: 'Perlu dicek', text: 'Unit masih bisa jalan, tetapi ada tanda bahaya: ketersediaan rendah atau servis terlambat.' },
  RFU: { term: 'RFU', text: 'Ready For Use: unit siap dioperasikan.' },
  PA: { term: 'PA', text: 'Physical Availability: persentase waktu unit tersedia (tidak sedang rusak atau diservis). Makin tinggi makin baik.' },
  MA: { term: 'MA', text: 'Mechanical Availability: ketersediaan dilihat dari sisi mekanis, dibanding jam kerja unit. Makin tinggi makin baik.' },
  MTBF: { term: 'MTBF', text: 'Mean Time Between Failure: rata-rata jam kerja unit sebelum rusak lagi. Makin tinggi makin baik.' },
  MTTR: { term: 'MTTR', text: 'Mean Time To Repair: rata-rata lama perbaikan sampai unit siap lagi. Makin rendah makin baik.' },
  HM: { term: 'HM', text: 'Hour Meter: meteran jam kerja mesin, seperti odometer di mobil.' },
  PM: { term: 'PM', text: 'Preventive Maintenance: servis berkala menurut HM, mis. PM250 = servis tiap 250 jam.' },
  WO: { term: 'WO', text: 'Work Order: surat perintah kerja untuk setiap perbaikan atau servis.' },
  BACKLOG: { term: 'Backlog', text: 'Pekerjaan yang belum selesai. Makin lama dibiarkan, makin besar risiko kerusakan lanjutan.' },
};
