// Komponen grafik yang dipakai ulang di dashboard (dibangun dengan Recharts).

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

// Indeks batang yang ditonjolkan: nilai tertinggi ('max') atau terendah ('min')
function highlightIndex(data, highlight) {
  if (!highlight || data.length < 2) return -1;
  const values = data.map((d) => d.value ?? 0);
  const target = highlight === 'max' ? Math.max(...values) : Math.min(...values);
  return values.indexOf(target);
}

/**
 * Grafik batang horizontal: satu batang per kategori, nilai di ujung batang.
 * `highlight` = 'max' / 'min' → batang terburuk diberi warna merah + label teks
 * (teknik "emphasis": satu masalah utama menonjol, sisanya warna netral).
 */
export function HorizontalBarChart({
  data,
  formatValue,
  formatTick,
  domainMax,
  target,
  targetLabel,
  labelWidth = 96,
  onSelect,
  highlight,
  highlightLabel,
}) {
  const colors = useChartColors();
  const height = Math.max(110, data.length * 28 + 36);
  const hi = highlightIndex(data, highlight);
  const hiText = highlightLabel ?? (highlight === 'min' ? 'terendah' : 'tertinggi');

  // Ruang kanan untuk label nilai menyesuaikan panjang label terpanjang
  const longest = Math.max(...data.map((d) => String(formatValue(d.value, d)).length));
  const rightMargin = Math.min(170, 14 + longest * 6.6);

  // Label nilai di ujung batang (teks memakai warna teks, bukan warna data)
  const renderLabel = ({ x, y, width, height: h, value, index }) => (
    <text x={x + width + 6} y={y + h / 2} dominantBaseline="middle" fontSize={11} fill={colors.secondary} fontWeight={index === hi ? 700 : 400}>
      {formatValue(value, data[index])}
    </text>
  );

  return (
    <>
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: target != null ? 20 : 4, right: rightMargin, bottom: 0, left: 0 }}>
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
          {data.map((d, i) => (
            <Cell key={d.name} fill={i === hi ? colors.critical : colors.series1} />
          ))}
          <LabelList dataKey="value" content={renderLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    {hi >= 0 && (
      <p className="chart-note">
        <span className="chart-note-swatch" style={{ background: colors.critical }} aria-hidden="true" />
        <span>
          <b>{hiText[0].toUpperCase() + hiText.slice(1)}:</b> {data[hi].name} · {formatValue(data[hi].value, data[hi])}
        </span>
      </p>
    )}
    </>
  );
}

/**
 * Grafik garis tren. `series` = [{ key, name, color }] — satu sumbu Y saja.
 */
export function TrendLineChart({ data, series, formatValue, formatTick, domain, target, targetLabel, height = 240 }) {
  const colors = useChartColors();
  const names = Object.fromEntries(series.map((s) => [s.key, s.name]));
  const directLabels = series.length > 1 && series.length <= 4;

  // Nama seri ditulis di ujung kanan garis (selain legenda), supaya tidak hanya mengandalkan warna
  const endLabel = (name) =>
    function EndLabel({ x, y, index }) {
      if (index !== data.length - 1) return null;
      return (
        <text x={x + 6} y={y} dominantBaseline="middle" fontSize={11} fill={colors.secondary}>
          {name}
        </text>
      );
    };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: directLabels ? 92 : 16, bottom: 0, left: 0 }}>
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
            label={directLabels ? endLabel(s.short ?? s.name) : false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Grafik batang bertumpuk horizontal (bagian-dari-keseluruhan per kategori).
 * `series` = [{ key, name, color }]; total ditulis di ujung batang.
 * Celah 2px warna latar memisahkan tiap segmen.
 */
export function StackedBarChart({ data, series, formatValue, formatTick, labelWidth = 96 }) {
  const colors = useChartColors();
  const names = Object.fromEntries(series.map((s) => [s.key, s.name]));
  const height = Math.max(110, data.length * 30 + 36);
  const totalOf = (row) => series.reduce((sum, s) => sum + (row[s.key] || 0), 0);

  const renderTotal = ({ x, y, width, height: h, index }) => (
    <text x={x + width + 6} y={y + h / 2} dominantBaseline="middle" fontSize={11} fill={colors.secondary}>
      {formatValue(totalOf(data[index]))}
    </text>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 70, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={colors.grid} />
        <XAxis type="number" tickFormatter={formatTick ?? formatValue} tick={tickStyle(colors.muted)} axisLine={{ stroke: colors.axis }} tickLine={false} />
        <YAxis type="category" dataKey="name" width={labelWidth} tick={tickStyle(colors.secondary)} axisLine={{ stroke: colors.axis }} tickLine={false} interval={0} />
        <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} content={<ChartTooltip formatValue={formatValue} names={names} />} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId="total"
            fill={s.color}
            stroke={colors.surface}
            strokeWidth={2}
            barSize={16}
            radius={i === series.length - 1 ? [0, 4, 4, 0] : 0}
            isAnimationActive={false}
          >
            {i === series.length - 1 && <LabelList dataKey={s.key} content={renderTotal} />}
          </Bar>
        ))}
      </BarChart>
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
