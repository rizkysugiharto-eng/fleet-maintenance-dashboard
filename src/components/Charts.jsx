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

// Isi tooltip: nilai ditebalkan, nama kategori di bawahnya.
function ChartTooltip({ active, payload, label, formatValue, labelFormatter }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      <strong>{formatValue(payload[0].value)}</strong>
      <span>{labelFormatter ? labelFormatter(label) : label}</span>
    </div>
  );
}

const tickStyle = (color) => ({ fill: color, fontSize: 12 });

/** Grafik batang horizontal: satu batang per kategori, nilai di ujung batang. */
export function HorizontalBarChart({ data, formatValue, formatTick, domainMax, target, targetLabel }) {
  const colors = useChartColors();
  const height = Math.max(120, data.length * 32 + 40);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: target != null ? 24 : 8, right: 72, bottom: 0, left: 0 }}>
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
          width={104}
          tick={tickStyle(colors.secondary)}
          axisLine={{ stroke: colors.axis }}
          tickLine={false}
        />
        {target != null && (
          <ReferenceLine
            x={target}
            stroke={colors.muted}
            label={{ value: targetLabel, position: 'top', fill: colors.muted, fontSize: 11 }}
          />
        )}
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.5 }}
          content={<ChartTooltip formatValue={formatValue} />}
        />
        <Bar dataKey="value" fill={colors.series} radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={formatValue}
            style={{ fill: colors.secondary, fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Grafik garis tren bulanan dengan garis target. */
export function TrendLineChart({ data, formatValue, formatTick, formatLabel, domain, target, targetLabel }) {
  const colors = useChartColors();

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 16, right: 24, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} />
        <XAxis
          dataKey="name"
          tickFormatter={formatLabel}
          tick={tickStyle(colors.muted)}
          axisLine={{ stroke: colors.axis }}
          tickLine={false}
          minTickGap={16}
        />
        <YAxis
          domain={domain}
          tickFormatter={formatTick ?? formatValue}
          tick={tickStyle(colors.muted)}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ stroke: colors.axis, strokeWidth: 1 }}
          content={<ChartTooltip formatValue={formatValue} labelFormatter={formatLabel} />}
        />
        {target != null && (
          <ReferenceLine
            y={target}
            stroke={colors.muted}
            label={{ value: targetLabel, position: 'insideBottomRight', fill: colors.muted, fontSize: 11 }}
          />
        )}
        <Line
          type="linear"
          dataKey="value"
          stroke={colors.series}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: colors.series, stroke: colors.surface, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
