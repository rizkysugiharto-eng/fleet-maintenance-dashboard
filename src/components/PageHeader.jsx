// Judul halaman: posisi halaman dalam alur kerja + judul + penjelasan singkat.

export const STEPS = {
  1: 'Langkah 1 · Catat data',
  2: 'Langkah 2 · Pantau pekerjaan',
  3: 'Langkah 3 · Analisis & rencana',
  settings: 'Pengaturan',
};

export default function PageHeader({ step, title, children, actions }) {
  return (
    <div className="page-header">
      <div>
        {step && <div className="page-step">{STEPS[step]}</div>}
        <h1>{title}</h1>
        {children && <p className="muted">{children}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
