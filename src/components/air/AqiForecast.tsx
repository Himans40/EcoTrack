/**
 * Next-24-hour AQI forecast card: a strip of forecast hours plus two plain
 * answers — when it will be worst, and the best time to be outside.
 */

import { CloudSun } from 'lucide-react'
import type { AirQualityHourlyPoint } from '@/types'
import { getAqiCategory } from '@/lib/aqi'
import { formatHour } from '@/lib/format'
import { Card, CardBody, CardHeader, EmptyState } from '../ui'
import { HourStrip } from './AqiReading'

/** The hour with the highest and the lowest forecast AQI. */
export function findForecastExtremes(points: AirQualityHourlyPoint[]) {
  const withAqi = points.filter((point) => point.usAqi !== null)
  if (withAqi.length === 0) return null
  let worst = withAqi[0]
  let best = withAqi[0]
  for (const point of withAqi) {
    if ((point.usAqi as number) > (worst.usAqi as number)) worst = point
    if ((point.usAqi as number) < (best.usAqi as number)) best = point
  }
  return { worst, best }
}

export function AqiForecast({ forecast }: { forecast: AirQualityHourlyPoint[] }) {
  const extremes = findForecastExtremes(forecast)

  return (
    <Card>
      <CardHeader
        title="Next 24 Hours"
        icon={<CloudSun className="h-4 w-4" aria-hidden />}
        subtitle="Model forecast from the CAMS atmospheric composition service, via Open-Meteo. Forecasts are estimates, not measurements."
      />
      <CardBody>
        {extremes ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-center">
            <div>
              <HourStrip points={forecast} compact />
              <div className="mt-2 flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <span>{formatHour(forecast[0].time)}</span>
                <span>{formatHour(forecast[forecast.length - 1].time)}</span>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              <ForecastFact label="Best time outside" point={extremes.best} />
              <ForecastFact label="Worst expected" point={extremes.worst} />
            </dl>
          </div>
        ) : (
          <EmptyState
            title="No forecast available"
            description="The provider did not return forecast hours for this location. Demonstration data never includes a forecast."
          />
        )}
      </CardBody>
    </Card>
  )
}

function ForecastFact({ label, point }: { label: string; point: AirQualityHourlyPoint }) {
  const category = getAqiCategory(point.usAqi)
  return (
    <div>
      <dt className="text-[13px] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-semibold text-slate-900 dark:text-white">
          {formatHour(point.time)}
        </span>
        <span className="text-sm" style={{ color: category?.hex }}>
          AQI {Math.round(point.usAqi ?? 0)}
        </span>
      </dd>
    </div>
  )
}
