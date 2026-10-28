// Judul halaman: posisi halaman dalam alur kerja + judul + penjelasan singkat.
// Judul juga dipakai untuk judul tab browser, supaya riwayat & tab mudah dibedakan.

import { useEffect } from 'react';

export const STEPS = {
  1: 'Langkah 1 · Catat data',
  2: 'Langkah 2 · Pantau pekerjaan',
  3: 'Langkah 3 · Analisis & rencana',
  settings: 'Pengaturan',
};

export default function PageHeader({ step, eyebrow, title, children, actions }) {
  useEffect(() => {
    document.title = `${title} · Fleet Maintenance`;
  }, [title]);

  return (
    <div className="page-header">
      <div>
        {(step || eyebrow) && <div className="page-step">{eyebrow ?? STEPS[step]}</div>}
        <h1>{title}</h1>
        {children && <p className="muted">{children}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
