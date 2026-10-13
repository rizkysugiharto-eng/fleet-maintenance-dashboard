// Komponen grafik yang dipakai ulang di dashboard (dibangun dengan Recharts).

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartColors } from '../lib/useChartColors.js';

const tickStyle = (color) => ({ fill: color, fontSize: 11 });

// Isi tooltip: nilai ditebalkan, nama seri di sebelahnya
function ChartTooltip({ active, payload, label, formatValue, formatLabel, names }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      <span>{formatLabel ? formatLabel(label) : label}</span>
      {payload.map((p) => (
        <div className="row" key={p.dataKey}>
          {payload.length > 1 && <span className="key" style={{ background: p.color }} />}
          <strong>{formatValue(p.value, p.payload)}</strong>
          {names?.[p.dataKey] && <span>{names[p.dataKey]}</span>}
        </div>
      ))}
    </div>
  );
}

/** Grafik batang horizontal: satu batang per kategori, nilai di ujung batang. */
export function HorizontalBarChart({ data, formatValue, formatTick, domainMax, target, targetLabel, labelWidth = 96, onSelect }) {
  const colors = useChartColors();
  const height = Math.max(110, data.length * 28 + 36);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: target != null ? 20 : 4, right: 76, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={colors.grid} />
        <XAxis
          type="number"
          domain={[0, domainMax ?? 'auto']}
          tickFormatter={formatTick ?? formatValue}
          tick={tickStyle(colors.muted)}
          axisLine={{ stroke: colors.axis }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={labelWidth}
          tick={tickStyle(colors.secondary)}
          axisLine={{ stroke: colors.axis }}
          tickLine={false}
          interval={0}
        />
        {target != null && (
          <ReferenceLine
            x={target}
            stroke={colors.muted}
            label={{ value: targetLabel, position: 'top', fill: colors.muted, fontSize: 10 }}
          />
        )}
        <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} content={<ChartTooltip formatValue={formatValue} />} />
        <Bar
          dataKey="value"
          fill={colors.series1}
          radius={[0, 4, 4, 0]}
          barSize={14}
          isAnimationActive={false}
          cursor={onSelect ? 'pointer' : undefined}
          onClick={onSelect ? (entry) => onSelect(entry.name ?? entry.payload?.name) : undefined}
        >
          <LabelList dataKey="value" position="right" formatter={formatValue} style={{ fill: colors.secondary, fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Grafik garis tren. `series` = [{ key, name, color }] — satu sumbu Y saja.
 */
export function TrendLineChart({ data, series, formatValue, formatTick, domain, target, targetLabel, height = 240 }) {
  const colors = useChartColors();
  const names = Object.fromEntries(series.map((s) => [s.key, s.name]));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} />
        <XAxis
          dataKey="name"
          tick={tickStyle(colors.muted)}
          axisLine={{ stroke: colors.axis }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          domain={domain}
          tickFormatter={formatTick ?? formatValue}
          tick={tickStyle(colors.muted)}
          axisLine={false}
          tickLine={false}
          width={44}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: colors.axis, strokeWidth: 1 }}
          content={<ChartTooltip formatValue={formatValue} names={names} />}
        />
        {target != null && (
          <ReferenceLine
            y={target}
            stroke={colors.muted}
            label={{ value: targetLabel, position: 'insideTopRight', fill: colors.muted, fontSize: 10 }}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            type="linear"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: s.color, stroke: colors.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Garis kecil tanpa sumbu untuk kartu KPI. */
export function Sparkline({ data, dataKey, color }) {
  return (
    <div className="sparkline" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line type="linear" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
