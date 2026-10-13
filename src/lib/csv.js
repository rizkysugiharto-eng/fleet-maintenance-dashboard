// Baca & tulis file CSV (format tabel teks yang bisa dibuka di Excel).

export function toCsv(rows, columns) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [columns.map(escape).join(','), ...rows.map((row) => columns.map((c) => escape(row[c])).join(','))].join('\n');
}

export function downloadCsv(filename, rows, columns) {
  // BOM di awal supaya Excel membaca huruf dengan benar
  const blob = new Blob(['﻿' + toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parser CSV sederhana: mendukung koma atau titik koma sebagai pemisah
 * dan teks dalam tanda kutip. Mengembalikan array objek {kolom: nilai}.
 */
export function parseCsv(text) {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0];
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

  const records = [];
  let field = '';
  let record = [];
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      record.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else field += ch;
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }

  const [header, ...body] = records.filter((r) => r.some((v) => v.trim() !== ''));
  if (!header) return [];
  const keys = header.map((h) => h.trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}
