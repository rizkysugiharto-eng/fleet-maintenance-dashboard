// Kartu pembungkus grafik. Setiap grafik bisa dialihkan ke tampilan tabel,
// supaya angka tetap bisa dibaca tanpa harus mengarahkan mouse ke grafik.

import { useState } from 'react';

export default function ChartCard({ title, subtitle, columns, rows, children }) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className="card chart-card">
      <header className="card-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <button type="button" className="btn-ghost" onClick={() => setShowTable((v) => !v)}>
          {showTable ? 'Lihat grafik' : 'Lihat tabel'}
        </button>
      </header>

      {showTable ? (
        <div className="table-wrap">
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
              {rows.map((row) => (
                <tr key={row.name}>
                  {columns.map((c) => (
                    <td key={c.label} className={c.numeric ? 'num' : undefined}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
