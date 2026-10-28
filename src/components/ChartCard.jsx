// Kartu pembungkus grafik. Setiap grafik bisa dialihkan ke tampilan tabel,
// supaya angka tetap bisa dibaca tanpa harus mengarahkan mouse ke grafik.

import { useState } from 'react';
import TableWrap from './TableWrap.jsx';

export default function ChartCard({ title, subtitle, columns, rows, legend, children, className = '' }) {
  const [showTable, setShowTable] = useState(false);
  const hasTable = columns && rows;

  return (
    <section className={`card card-pad ${className}`}>
      <header className="card-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {hasTable && (
          <button type="button" className="btn-ghost btn-small" aria-pressed={showTable} onClick={() => setShowTable((v) => !v)}>
            Tabel
          </button>
        )}
      </header>

      {showTable ? (
        <TableWrap label={title}>
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.label} className={c.numeric ? 'num' : undefined}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.name ?? i}>
                  {columns.map((c) => (
                    <td key={c.label} className={c.numeric ? 'num' : undefined}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <>
          {legend}
          {children}
        </>
      )}
    </section>
  );
}

// Legenda sederhana: garis/kotak warna + nama seri
export function Legend({ items, shape = 'line' }) {
  return (
    <div className="legend" aria-hidden="true">
      {items.map((item) => (
        <span key={item.label} className="legend-item">
          <span className="legend-swatch" style={{ background: item.color, height: shape === 'line' ? 3 : 10 }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
