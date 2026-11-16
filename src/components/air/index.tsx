/**
 * Air quality presentation components.
 */

import { Info } from 'lucide-react'
import type { AirQualitySnapshot, PollutantKey, PollutantReading } from '@/types'
import {
  AQI_CATEGORIES,
  AQI_MAX,
  getAqiCategory,
  POLLUTANT_META,
} from '@/lib/aqi'
import { formatNumber } from '@/lib/format'
import { Badge } from '../ui'

/* -------------------------------------------------------------------------- */
/*  Arc gauge                                                                 */
/* -------------------------------------------------------------------------- */

const GAUGE_SIZE = 220
const GAUGE_RADIUS = 88
const GAUGE_STROKE = 16
const CENTER = GAUGE_SIZE / 2

/** Map a 0-1 fraction of the scale onto the gauge's 180°→360° sweep. */
function fractionToAngle(fraction: number): number {
  return 180 + Math.min(1, Math.max(0, fraction)) * 180
}

function polarToCartesian(angleDegrees: number, radius: number) {
  const radians = (angleDegrees * Math.PI) / 180
  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  }
}

function describeArc(startFraction: number, endFraction: number, radius: number) {
  const startAngle = fractionToAngle(startFraction)
  const endAngle = fractionToAngle(endFraction)
  const start = polarToCartesian(startAngle, radius)
  const end = polarToCartesian(endAngle, radius)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

/**
 * Semicircular AQI gauge.
 *
 * Each of the six EPA categories occupies a band proportional to its real
 * width on the 0-500 scale, so the needle position is honest rather than
 * evenly spaced.
 */
export function AqiGauge({ aqi }: { aqi: number | null }) {
  const category = getAqiCategory(aqi)
  const fraction = aqi === null ? 0 : Math.min(1, Math.max(0, aqi / AQI_MAX))
  const needle = polarToCartesian(fractionToAngle(fraction), GAUGE_RADIUS + 12)

  return (
    <div className="flex flex-col items-center">
      <svg
        width={GAUGE_SIZE}
        height={CENTER + 28}
        viewBox={`0 0 ${GAUGE_SIZE} ${CENTER + 28}`}
        role="img"
        aria-label={
          aqi === null
            ? 'Air Quality Index unavailable'
            : `Air Quality Index ${Math.round(aqi)}, category ${category?.label ?? 'unknown'}`
        }
        className="overflow-visible"
      >
        {/* Category bands */}
        {AQI_CATEGORIES.map((item) => (
          <path
            key={item.key}
            d={describeArc(
              item.range[0] / AQI_MAX,
              Math.min(1, (item.range[1] + 1) / AQI_MAX),
              GAUGE_RADIUS,
            )}
            stroke={item.hex}
            strokeWidth={GAUGE_STROKE}
            strokeLinecap="butt"
            fill="none"
            opacity={category && category.key === item.key ? 1 : 0.28}
          />
        ))}

        {/* Needle */}
        {aqi !== null ? (
          <>
            <line
              x1={CENTER}
              y1={CENTER}
              x2={needle.x}
              y2={needle.y}
              stroke={category?.hex ?? '#8f9c95'}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={6}
              fill={category?.hex ?? '#8f9c95'}
            />
          </>
        ) : null}

        {/* Scale end labels */}
        <text
          x={CENTER - GAUGE_RADIUS}
          y={CENTER + 22}
          textAnchor="middle"
          className="fill-slate-400 text-[10px]"
        >
          0
        </text>
        <text
          x={CENTER + GAUGE_RADIUS}
          y={CENTER + 22}
          textAnchor="middle"
          className="fill-slate-400 text-[10px]"
        >
          500
        </text>
      </svg>

      <div className="-mt-10 flex flex-col items-center">
        <span
          className="text-5xl font-bold leading-none"
          style={{ color: category?.hex }}
        >
          {aqi === null ? '—' : Math.round(aqi)}
        </span>
        <span className="mt-1 text-xs font-medium  text-slate-500 dark:text-slate-400">
          US AQI
        </span>
        {category ? (
          <Badge className={`mt-3 ${category.colorClass}`}>{category.label}</Badge>
        ) : (
          <Badge className="mt-3 bg-slate-100 text-slate-600 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-300">
            Unavailable
          </Badge>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Scale strip                                                               */
/* -------------------------------------------------------------------------- */

/** Horizontal 0-500 strip with the current value marked. */
export function AqiScaleStrip({ aqi }: { aqi: number | null }) {
  return (
    <div>
      <div className="relative">
        <div className="flex h-2.5 overflow-hidden rounded-full">
          {AQI_CATEGORIES.map((category) => (
            <div
              key={category.key}
              style={{
                backgroundColor: category.hex,
                // Width proportional to the band's real share of 0-500.
                flexGrow: category.range[1] - category.range[0] + 1,
              }}
              title={`${category.label} (${category.range[0]}–${category.range[1]})`}
            />
          ))}
        </div>
        {aqi !== null ? (
          <div
            className="absolute -top-1 h-4.5 w-1 -translate-x-1/2 rounded-full bg-slate-900 ring-2 ring-white dark:bg-white dark:ring-slate-900"
            style={{
              left: `${Math.min(100, Math.max(0, (aqi / AQI_MAX) * 100))}%`,
              height: '1.125rem',
            }}
            aria-hidden
          />
        ) : null}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>0</span>
        <span>50</span>
        <span>100</span>
        <span>150</span>
        <span>200</span>
        <span>300</span>
        <span>500</span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Pollutant cards                                                           */
/* -------------------------------------------------------------------------- */

export function PollutantCard({
  reading,
  isDominant,
}: {
  reading: PollutantReading
  isDominant: boolean
}) {
  const meta = POLLUTANT_META[reading.key]
  const subCategory = getAqiCategory(reading.subIndex)

  return (
    <div
      className={`rounded-lg border p-4 ${
        isDominant
          ? 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/50'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {meta.formula}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={meta.label}>
            {meta.label}
          </p>
        </div>
        {isDominant ? (
          <Badge className="bg-slate-900 text-white ring-transparent dark:bg-white dark:text-slate-900">
            Dominant
          </Badge>
        ) : null}
      </div>

      <p className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-100">
          {formatNumber(reading.value, 1)}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{meta.unit}</span>
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-800">
        <span className="text-xs text-slate-500 dark:text-slate-400">Sub-index</span>
        {reading.subIndex !== null && subCategory ? (
          <Badge className={subCategory.colorClass}>{reading.subIndex}</Badge>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
        {meta.averagingPeriod}
      </p>
    </div>
  )
}

export function PollutantGrid({
  snapshot,
  order,
}: {
  snapshot: AirQualitySnapshot
  order?: PollutantKey[]
}) {
  const readings = order
    ? order
        .map((key) => snapshot.pollutants.find((p) => p.key === key))
        .filter((p): p is PollutantReading => Boolean(p))
    : snapshot.pollutants

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {readings.map((reading) => (
        <PollutantCard
          key={reading.key}
          reading={reading}
          isDominant={snapshot.dominantPollutant === reading.key}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Health advice                                                             */
/* -------------------------------------------------------------------------- */

export function AqiAdvice({ aqi }: { aqi: number | null }) {
  const category = getAqiCategory(aqi)
  if (!category) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No AQI value is available, so no guidance can be shown.
      </p>
    )
  }
  return (
    <div className="flex items-start gap-3">
      <Info
        className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
        aria-hidden
      />
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {category.label} — {category.range[0]} to {category.range[1]}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {category.healthEffects}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {category.shortAdvice}
        </p>
      </div>
    </div>
  )
}
