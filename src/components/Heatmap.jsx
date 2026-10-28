// Heatmap ketersediaan armada: baris = tipe unit, kolom = periode waktu.
// Makin pekat warnanya, makin lama unit down. Klik sel untuk melihat WO penyebabnya.
// Keyboard: hanya satu sel yang masuk urutan Tab; pindah sel dengan tombol panah, Home/End.

import { useRef, useState } from 'react';
import { formatNumber } from '../lib/format.js';
import { useChartColors } from '../lib/useChartColors.js';

// Petakan nilai ke salah satu dari 6 tingkat warna (0 = tidak ada downtime)
function level(value, max) {
  if (value <= 0) return 0;
  return Math.min(5, 1 + Math.floor((value / max) * 5));
}

export default function Heatmap({ rows, buckets, max, onSelect, unitLabel = 'jam down / unit' }) {
  const colors = useChartColors();
  const labelEvery = Math.ceil(buckets.length / 12);
  // Sel dengan downtime tertinggi diberi bingkai merah
  const worst = rows.flatMap((r) => r.cells.map((v, i) => ({ row: r.name, i, v }))).reduce((a, b) => (b.v > a.v ? b : a), { v: 0 });
  const worstRow = Math.max(0, rows.findIndex((r) => r.name === worst.row));
  const [active, setActive] = useState({ r: worstRow, c: worst.i ?? 0 });
  const cellRefs = useRef({});
  const pos = { r: Math.min(active.r, rows.length - 1), c: Math.min(active.c, buckets.length - 1) };

  function onKeyDown(e) {
    const moves = {
      ArrowRight: [0, 1],
      ArrowLeft: [0, -1],
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
    };
    let next;
    if (moves[e.key]) next = { r: pos.r + moves[e.key][0], c: pos.c + moves[e.key][1] };
    else if (e.key === 'Home') next = { r: pos.r, c: 0 };
    else if (e.key === 'End') next = { r: pos.r, c: buckets.length - 1 };
    else return;
    e.preventDefault();
    next = { r: Math.max(0, Math.min(rows.length - 1, next.r)), c: Math.max(0, Math.min(buckets.length - 1, next.c)) };
    setActive(next);
    cellRefs.current[`${next.r}-${next.c}`]?.focus();
  }

  return (
    <div className="heatmap">
      <div
        className="heatmap-grid"
        role="group"
        aria-label="Heatmap downtime per tipe unit dan periode. Gunakan tombol panah untuk berpindah sel, Enter untuk melihat WO."
        onKeyDown={onKeyDown}
        style={{ gridTemplateColumns: `112px repeat(${buckets.length}, minmax(24px, 1fr))` }}
      >
        {rows.map((row, r) => (
          <div className="heatmap-row" key={row.name}>
            <span className="heatmap-label">
              {row.name}
            </span>
            {row.cells.map((value, i) => (
              <button
                key={buckets[i].start}
                ref={(el) => {
                  cellRefs.current[`${r}-${i}`] = el;
                }}
                type="button"
                tabIndex={pos.r === r && pos.c === i ? 0 : -1}
                onFocus={() => setActive({ r, c: i })}
                className="heatmap-cell"
                style={{
                  background: colors.heat[level(value, max)],
                  ...(worst.row === row.name && worst.i === i ? { boxShadow: `0 0 0 2px ${colors.critical}`, position: 'relative', zIndex: 1 } : {}),
                }}
                title={`${row.name} · ${buckets[i].label}: ${formatNumber(value, 1)} ${unitLabel}${worst.row === row.name && worst.i === i ? ' (tertinggi)' : ''}`}
                aria-label={`${row.name}, ${buckets[i].label}: ${formatNumber(value, 1)} ${unitLabel}${worst.row === row.name && worst.i === i ? ', tertinggi' : ''}`}
                onClick={() => onSelect?.(row.name, buckets[i])}
              />
            ))}
          </div>
        ))}
        <span />
        {buckets
          .filter((_, i) => i % labelEvery === 0)
          .map((b, i) => (
            <span
              key={b.start}
              className="heatmap-axis"
              style={{ gridColumn: `span ${Math.min(labelEvery, buckets.length - i * labelEvery)}` }}
            >
              {b.label}
            </span>
          ))}
      </div>
      <div className="heatmap-legend">
        <span>0 jam</span>
        {colors.heat.map((c) => (
          <span key={c} className="swatch" style={{ background: c }} />
        ))}
        <span>{formatNumber(max)} {unitLabel}</span>
        {worst.v > 0 && (
          <span style={{ marginLeft: 'auto' }}>
            <span className="swatch" style={{ display: 'inline-block', verticalAlign: 'middle', background: 'transparent', boxShadow: `inset 0 0 0 2px ${colors.critical}` }} />{' '}
            Tertinggi: {worst.row} · {buckets[worst.i].label} ({formatNumber(worst.v)} jam)
          </span>
        )}
      </div>
    </div>
  );
}
