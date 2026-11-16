/**
 * The large AQI reading at the top of the overview page, with a strip of the
 * last 24 hourly readings underneath. Each bar in the strip is coloured by
 * its EPA category, so a bad stretch of the day stands out at a glance.
 */

import type { AirQualityHourlyPoint, PollutantKey } from '@/types'
import { getAqiCategory, POLLUTANT_META } from '@/lib/aqi'
import { formatHour } from '@/lib/format'

/** How many hours the strip shows. */
const STRIP_HOURS = 24

/** Pick the last 24 hours that actually have an AQI value. */
export function lastDayOfReadings(points: AirQualityHourlyPoint[]): AirQualityHourlyPoint[] {
  return points.filter((point) => point.usAqi !== null).slice(-STRIP_HOURS)
}

export function AqiReading({
  aqi,
  dominantPollutant,
  hourly,
  locationName,
}: {
  aqi: number | null
  dominantPollutant: PollutantKey | null
  hourly: AirQualityHourlyPoint[]
  locationName: string
}) {
  const category = getAqiCategory(aqi)
  const color = category?.hex ?? '#8f9c95'
  const dominant = dominantPollutant ? POLLUTANT_META[dominantPollutant] : null

  return (
    <section
      aria-label="Current air quality reading"
      className="card overflow-hidden"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Air quality in {locationName} right now
          </p>
          <div className="mt-2 flex items-end gap-4">
            <span
              className="text-[5.5rem] font-semibold leading-[0.85] tracking-[-0.04em] sm:text-[7rem]"
              style={{ color }}
            >
              {aqi === null ? '—' : Math.round(aqi)}
            </span>
            <span className="pb-2">
              <span className="block text-lg font-semibold text-slate-900 dark:text-white">
                {category?.label ?? 'No reading'}
              </span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">US AQI</span>
            </span>
          </div>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
            {category?.shortAdvice ?? 'No AQI value is available for this location yet.'}
            {dominant ? ` Mostly driven by ${dominant.shortLabel}.` : ''}
          </p>
        </div>

        <HourStrip points={lastDayOfReadings(hourly)} />
      </div>
    </section>
  )
}

/**
 * Bars for each of the last 24 hours. Heights use a fixed 0-300 scale (or the
 * peak, if higher) so the same AQI looks the same height for every city.
 */
function HourStrip({ points }: { points: AirQualityHourlyPoint[] }) {
  if (points.length === 0) return null

  const highest = Math.max(...points.map((point) => point.usAqi ?? 0))
  const scaleTop = Math.max(300, highest)

  return (
    <figure>
      <figcaption className="mb-3 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Last {points.length} hours</span>
        <span>Peak {Math.round(highest)}</span>
      </figcaption>
      <div className="flex h-24 items-end gap-[3px]" role="list">
        {points.map((point) => {
          const value = point.usAqi ?? 0
          const category = getAqiCategory(value)
          const label = `${formatHour(point.time)}: AQI ${Math.round(value)}, ${category?.label ?? ''}`
          return (
            <div
              key={point.time}
              role="listitem"
              aria-label={label}
              title={label}
              className="flex-1 rounded-[2px] transition-opacity hover:opacity-70"
              style={{
                height: `${Math.max(4, (value / scaleTop) * 100)}%`,
                backgroundColor: category?.hex ?? '#8f9c95',
              }}
            />
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span>{formatHour(points[0].time)}</span>
        <span>{formatHour(points[Math.floor(points.length / 2)].time)}</span>
        <span>Now</span>
      </div>
    </figure>
  )
}
