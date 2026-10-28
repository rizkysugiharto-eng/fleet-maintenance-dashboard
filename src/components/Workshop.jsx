// Elemen visual "Papan Workshop": benda yang memang ada di lapangan.
// - UnitPlate : kode unit seperti nomor lambung yang dicat stensil di bodi alat
// - StatusTag : status unit seperti tag LOTO di workshop (selalu ada teks, bukan warna saja)
// - Odometer  : hour meter seperti meteran mekanis

import { GLOSSARY } from '../data/catalog.js';

const TAG_TEXT = { critical: 'B/D', warning: 'Perlu dicek', good: 'RFU' };
// Keterangan saat kursor diarahkan ke tag (pengunjung awam)
const TAG_HINT = { critical: GLOSSARY.BD.text, warning: GLOSSARY.CEK.text, good: GLOSSARY.RFU.text };

export function UnitPlate({ code, size = 'md' }) {
  return <span className={`plate plate-${size}`}>{code}</span>;
}

export function StatusTag({ level, children }) {
  return (
    <span className={`loto loto-${level}`} title={TAG_HINT[level]}>
      {children ?? TAG_TEXT[level]}
    </span>
  );
}

export function Odometer({ value, digits = 6 }) {
  const text = String(Math.max(0, Math.round(value ?? 0))).padStart(digits, '0');
  const firstReal = text.search(/[1-9]/);
  return (
    <span className="odo" role="img" aria-label={`Hour meter ${Math.round(value ?? 0).toLocaleString('id-ID')}`}>
      {[...text].map((d, i) => (
        <span key={i} className={firstReal === -1 || i < firstReal ? 'odo-lead' : undefined} aria-hidden="true">
          {d}
        </span>
      ))}
    </span>
  );
}

export { TAG_TEXT };
