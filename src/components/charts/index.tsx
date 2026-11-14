/**
 * Chart components.
 *
 * All air-quality charts are plotted against the API's own hourly timestamps,
 * and all water charts against the `sampledAt` timestamps the user recorded.
 * No time axis is ever synthesised.
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AirQualityHourlyPoint, WaterMeasurement } from '@/types'
import { AQI_CATEGORIES, POLLUTANT_META } from '@/lib/aqi'
import { assessWaterMeasurement, WATER_PARAMETERS } from '@/lib/wqi'
import { formatDate, formatDateTime, formatHour } from '@/lib/format'
import { useChartTheme } from './chartTheme'
import { EmptyState } from '../ui'
import { LineChart as LineChartIcon } from 'lucide-react'

/** Shared tooltip styling so every chart reads identically. */
function useTooltipProps() {
  const theme = useChartTheme()
  return {
    contentStyle: {
      backgroundColor: theme.tooltipBg,
      border: `1px solid ${theme.tooltipBorder}`,
      borderRadius: '0.5rem',
      fontSize: '0.75rem',
      color: theme.tooltipText,
      boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
    },
    labelStyle: { color: theme.tooltipText, fontWeight: 600, marginBottom: 2 },
    itemStyle: { color: theme.tooltipText },
  }
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <EmptyState
      icon={<LineChartIcon className="h-6 w-6" aria-hidden />}
      title="Nothing to chart yet"
      description={message}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  AQI trend                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * US AQI over time, with EPA category thresholds drawn as reference lines so
 * the shape of the curve can be read against the scale it belongs to.
 */
export function AqiTrendChart({
  points,
  height = 280,
}: {
  points: AirQualityHourlyPoint[]
  height?: number
}) {
  const theme = useChartTheme()
  const tooltip = useTooltipProps()

  const data = points.filter((point) => point.usAqi !== null)
  if (data.length === 0) {
    return <ChartEmpty message="No AQI history is available for this location yet." />
  }

  const maxAqi = Math.max(...data.map((point) => point.usAqi ?? 0))
  // Only draw thresholds the data actually reaches, to avoid a squashed axis.
  const thresholds = AQI_CATEGORIES.filter(
    (category) => category.range[0] > 0 && category.range[0] <= maxAqi * 1.25,
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1caa6b" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#1caa6b" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="time"
          tickFormatter={formatHour}
          tick={{ fill: theme.axis, fontSize: 11 }}
          stroke={theme.grid}
          minTickGap={28}
        />
        <YAxis
          tick={{ fill: theme.axis, fontSize: 11 }}
          stroke={theme.grid}
          domain={[0, 'auto']}
          width={48}
        />
        <Tooltip
          {...tooltip}
          labelFormatter={(value) => formatDateTime(String(value))}
          formatter={(value: number | string) => [value, 'US AQI']}
        />
        {thresholds.map((category) => (
          <ReferenceLine
            key={category.key}
            y={category.range[0]}
            stroke={category.hex}
            strokeDasharray="4 4"
            strokeOpacity={0.7}
            label={{
              value: category.label,
              position: 'insideTopLeft',
              fill: category.hex,
              fontSize: 10,
            }}
          />
        ))}
        <Area
          type="monotone"
          dataKey="usAqi"
          name="US AQI"
          stroke="#108855"
          strokeWidth={2}
          fill="url(#aqiFill)"
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* -------------------------------------------------------------------------- */
/*  Pollutant trends                                                          */
/* -------------------------------------------------------------------------- */

const POLLUTANT_COLORS: Record<string, string> = {
  pm2_5: '#dc2626',
  pm10: '#ea580c',
  ozone: '#2576eb',
  nitrogen_dioxide: '#7e22ce',
  sulphur_dioxide: '#ca8a04',
  carbon_monoxide: '#0f766e',
}

/** One or more pollutant concentration series on a shared axis. */
export function PollutantTrendChart({
  points,
  pollutants,
  height = 280,
}: {
  points: AirQualityHourlyPoint[]
  pollutants: (keyof typeof POLLUTANT_COLORS)[]
  height?: number
}) {
  const theme = useChartTheme()
  const tooltip = useTooltipProps()

  const hasData = points.some((point) =>
    pollutants.some((key) => point[key as keyof AirQualityHourlyPoint] !== null),
  )
  if (!hasData) {
    return (
      <ChartEmpty message="No pollutant history is available for this location yet." />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="time"
          tickFormatter={formatHour}
          tick={{ fill: theme.axis, fontSize: 11 }}
          stroke={theme.grid}
          minTickGap={28}
        />
        <YAxis
          tick={{ fill: theme.axis, fontSize: 11 }}
          stroke={theme.grid}
          width={48}
          label={{
            value: 'µg/m³',
            angle: -90,
            position: 'insideLeft',
            fill: theme.axis,
            fontSize: 11,
            offset: 18,
          }}
        />
        <Tooltip
          {...tooltip}
          labelFormatter={(value) => formatDateTime(String(value))}
        />
        {pollutants.length > 1 ? (
          <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }} />
        ) : null}
        {pollutants.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={POLLUTANT_META[key as keyof typeof POLLUTANT_META].shortLabel}
            stroke={POLLUTANT_COLORS[key]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/* -------------------------------------------------------------------------- */
/*  Temperature + humidity                                                    */
/* -------------------------------------------------------------------------- */

export function WeatherTrendChart({
  points,
  height = 260,
}: {
  points: { time: string; temperatureC: number | null; relativeHumidity: number | null }[]
  height?: number
}) {
  const theme = useChartTheme()
  const tooltip = useTooltipProps()

  if (points.length === 0) {
    return <ChartEmpty message="No weather history is available for this location yet." />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="time"
          tickFormatter={formatHour}
          tick={{ fill: theme.axis, fontSize: 11 }}
          stroke={theme.grid}
          minTickGap={28}
        />
        <YAxis
          yAxisId="temp"
          tick={{ fill: theme.axis, fontSize: 11 }}
          stroke={theme.grid}
          width={48}
        />
        <YAxis
          yAxisId="humidity"
          orientation="right"
          domain={[0, 100]}
          tick={{ fill: theme.axis, fontSize: 11 }}
          stroke={theme.grid}
          width={42}
        />
        <Tooltip {...tooltip} labelFormatter={(value) => formatDateTime(String(value))} />
        <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }} />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="temperatureC"
          name="Temperature (°C)"
          stroke="#ea580c"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          yAxisId="humidity"
          type="monotone"
          dataKey="relativeHumidity"
          name="Humidity (%)"
          stroke="#2576eb"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/* -------------------------------------------------------------------------- */
/*  Water trends                                                              */
/* -------------------------------------------------------------------------- */

const WATER_COLORS: Record<string, string> = {
  ph: '#7e22ce',
  turbidity: '#a16207',
  dissolvedOxygen: '#0f766e',
  tds: '#2576eb',
  conductivity: '#be123c',
  temperature: '#ea580c',
  score: '#108855',
}

type WaterSeriesKey = keyof typeof WATER_COLORS

/**
 * A recorded water parameter over time.
 *
 * Samples are irregular by nature — a user records one whenever they collect
 * one — so points are always shown as markers on a line, never as a smooth
 * continuous curve that would imply readings in between.
 */
export function WaterTrendChart({
  measurements,
  series,
  height = 260,
}: {
  measurements: WaterMeasurement[]
  series: WaterSeriesKey
  height?: number
}) {
  const theme = useChartTheme()
  const tooltip = useTooltipProps()

  // Oldest first, so time runs left to right.
  const ordered = [...measurements].sort(
    (a, b) => Date.parse(a.sampledAt) - Date.parse(b.sampledAt),
  )

  const data = ordered.map((measurement) => ({
    sampledAt: measurement.sampledAt,
    label: measurement.sampleLocation,
    value:
      series === 'score'
        ? assessWaterMeasurement(measurement).score
        : (measurement[series as keyof WaterMeasurement] as number),
  }))

  if (data.length === 0) {
    return (
      <ChartEmpty message="Record at least one water sample to see it plotted here." />
    )
  }

  const meta =
    series === 'score'
      ? { label: 'Composite WQI score', unit: '' }
      : {
          label: WATER_PARAMETERS[series as keyof typeof WATER_PARAMETERS].label,
          unit: WATER_PARAMETERS[series as keyof typeof WATER_PARAMETERS].unit,
        }

  const unitSuffix = meta.unit ? ` ${meta.unit}` : ''

  // A single sample has nothing to connect, so it is drawn as one point.
  if (data.length === 1) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="sampledAt"
            tickFormatter={(value) => formatDate(String(value))}
            tick={{ fill: theme.axis, fontSize: 11 }}
            stroke={theme.grid}
          />
          <YAxis
            dataKey="value"
            tick={{ fill: theme.axis, fontSize: 11 }}
            stroke={theme.grid}
            width={48}
          />
          <Tooltip
            {...tooltip}
            labelFormatter={(value) => formatDate(String(value))}
            formatter={(value: number) => [`${value}${unitSuffix}`, meta.label]}
          />
          <Scatter data={data} fill={WATER_COLORS[series]} name={meta.label} />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="sampledAt"
          tickFormatter={(value) => formatDate(String(value))}
          tick={{ fill: theme.axis, fontSize: 11 }}
          stroke={theme.grid}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: theme.axis, fontSize: 11 }}
          stroke={theme.grid}
          width={48}
        />
        <Tooltip
          {...tooltip}
          labelFormatter={(value) => formatDateTime(String(value))}
          formatter={(value: number) => [`${value}${unitSuffix}`, meta.label]}
        />
        <Line
          type="linear"
          dataKey="value"
          name={meta.label}
          stroke={WATER_COLORS[series]}
          strokeWidth={2}
          dot={{ r: 4, strokeWidth: 0, fill: WATER_COLORS[series] }}
          activeDot={{ r: 6 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
