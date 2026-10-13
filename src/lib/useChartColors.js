// Library grafik (Recharts) butuh warna dalam bentuk teks hex, bukan variabel CSS.
// Hook ini membaca variabel warna dari styles.css dan membacanya ulang
// setiap kali tema berganti (gelap ↔ terang).

import { useEffect, useState } from 'react';
import { useData } from '../context/DataContext.jsx';

function readColors() {
  const style = getComputedStyle(document.documentElement);
  const get = (name) => style.getPropertyValue(name).trim();
  return {
    series1: get('--series-1'),
    series2: get('--series-2'),
    grid: get('--grid'),
    axis: get('--axis'),
    muted: get('--text-muted'),
    secondary: get('--text-secondary'),
    surface: get('--surface-1'),
    good: get('--good'),
    warning: get('--warning'),
    serious: get('--serious'),
    critical: get('--critical'),
    heat: [0, 1, 2, 3, 4, 5].map((i) => get(`--heat-${i}`)),
  };
}

export function useChartColors() {
  const { prefs } = useData();
  const [colors, setColors] = useState(readColors);
  useEffect(() => setColors(readColors()), [prefs.theme]);
  return colors;
}
