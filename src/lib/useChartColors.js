// Library grafik (Recharts) butuh warna dalam bentuk teks hex, bukan variabel CSS.
// Hook ini membaca variabel warna dari styles.css dan memperbaruinya
// saat tema perangkat berganti terang ↔ gelap.

import { useEffect, useState } from 'react';

function readColors() {
  const style = getComputedStyle(document.documentElement);
  const get = (name) => style.getPropertyValue(name).trim();
  return {
    series: get('--series-1'),
    grid: get('--grid'),
    axis: get('--axis'),
    muted: get('--text-muted'),
    secondary: get('--text-secondary'),
    surface: get('--surface-1'),
  };
}

export function useChartColors() {
  const [colors, setColors] = useState(readColors);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setColors(readColors());
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return colors;
}
