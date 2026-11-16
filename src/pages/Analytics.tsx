/**
 * Historical Analytics page.
 *
 * Air charts use the provider's own hourly timestamps; water charts use the
 * `sampledAt` timestamps the user recorded. No time axis is synthesised, and
 * summary statistics are computed from exactly the points on screen.
 */

import { useMemo } from 'react'
import { Download, Droplets, LineChart as LineChartIcon, Thermometer, Wind } from 'lucide-react'
import type { AirQualityHourlyPoint } from '@/types'
import { useEnvironment } from '@/context/EnvironmentDataContext'
import { useSettings, HISTORY_WINDOW_OPTIONS } from '@/context/SettingsContext'
import { useWaterMeasurements } from '@/context/WaterContext'
import { useLocations } from '@/context/LocationContext'
import {
  AqiTrendChart,
  PollutantTrendChart,
  WaterTrendChart,
  WeatherTrendChart,
} from '@/components/charts'
import { PageHeader, StatCard } from '@/components/StatCard'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DemoDataBanner,
  EmptyState,
  ErrorState,
  ProvenanceFooter,
  SkeletonBlock,
} from '@/components/ui'
import { getAqiCategory } from '@/lib/aqi'
import { airHistoryToCsv, buildExportFilename, downloadTextFile } from '@/lib/csv'
import { averageWaterScore, describeMeasurementOrigin } from '@/lib/wqi'
import { formatDateTime, formatLocationName, formatTemperature } from '@/lib/format'

/** Min / max / mean of a numeric series, ignoring nulls. */
function summarise(values: (number | null)[]): {
  min: number | null
  max: number | null
  mean: number | null
  count: number
} {
  const clean = values.filter((value): value is number => value !== null)
  if (clean.length === 0) return { min: null, max: null, mean: null, count: 0 }
  const sum = clean.reduce((total, value) => total + value, 0)
  return {
    min: Math.min(...clean),
    max: Math.max(...clean),
    mean: Math.round((sum / clean.length) * 10) / 10,
    count: clean.length,
  }
}

function peakHour(points: AirQualityHourlyPoint[]): AirQualityHourlyPoint | null {
  let peak: AirQualityHourlyPoint | null = null
  for (const point of points) {
    if (point.usAqi === null) continue
    if (!peak || (peak.usAqi ?? -1) < point.usAqi) peak = point
  }
  return peak
}

export default function AnalyticsPage() {
  const { settings, updateSettings } = useSettings()
  const { activeLocation } = useLocations()
  const { measurements } = useWaterMeasurements()
  const {
    airQuality,
    weather,
    isLoading,
    error,
    isDemoMode,
    refresh,
    useDemoData,
  } = useEnvironment()

  const aqiStats = useMemo(
    () => summarise((airQuality?.hourly ?? []).map((point) => point.usAqi)),
    [airQuality],
  )
  const pm25Stats = useMemo(
    () => summarise((airQuality?.hourly ?? []).map((point) => point.pm2_5)),
    [airQuality],
  )
  const pm10Stats = useMemo(
    () => summarise((airQuality?.hourly ?? []).map((point) => point.pm10)),
    [airQuality],
  )
  const tempStats = useMemo(
    () => summarise((weather?.hourly ?? []).map((point) => point.temperatureC)),
    [weather],
  )

  const peak = useMemo(() => peakHour(airQuality?.hourly ?? []), [airQuality])
  const peakCategory = getAqiCategory(peak?.usAqi ?? null)
  const waterAverage = averageWaterScore(measurements)
  const waterOrigin = describeMeasurementOrigin(measurements)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Historical Analytics"
        description={
          <>
            Trends for{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {formatLocationName(activeLocation)}
            </span>
            . Air and weather series come from the API's hourly timestamps; water
            series come from the sample times you recorded.
          </>
        }
        actions={
          <>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="whitespace-nowrap">Air &amp; weather period</span>
              <select
                value={settings.historyWindowHours}
                onChange={(event) =>
                  updateSettings({ historyWindowHours: Number(event.target.value) })
                }
                className="field-input w-auto py-1.5 text-xs"
              >
                {HISTORY_WINDOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              size="sm"
              disabled={!airQuality || airQuality.hourly.length === 0}
              onClick={() =>
                airQuality &&
                downloadTextFile(
                  buildExportFilename(`aqi-history-${activeLocation.name.toLowerCase()}`),
                  airHistoryToCsv(airQuality.hourly),
                )
              }
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export CSV
            </Button>
          </>
        }
      />

      {isDemoMode ? <DemoDataBanner /> : null}

      {error && !airQuality ? (
        <Card>
          <ErrorState message={error} onRetry={refresh} onUseDemo={useDemoData} />
        </Card>
      ) : null}

      {/* Summary statistics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading ? (
          <>
            <SkeletonBlock className="h-32" />
            <SkeletonBlock className="h-32" />
            <SkeletonBlock className="h-32" />
            <SkeletonBlock className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              label="Mean AQI"
              value={aqiStats.mean ?? '—'}
              unit="US AQI"
              icon={<Wind className="h-4 w-4" aria-hidden />}
              footer={
                aqiStats.count > 0
                  ? `Range ${aqiStats.min}–${aqiStats.max} over ${aqiStats.count} hours`
                  : 'No hourly data'
              }
              origin={airQuality?.provenance.origin}
            />
            <StatCard
              label="Peak AQI hour"
              value={peak?.usAqi ?? '—'}
              unit="US AQI"
              accentClass="text-red-500"
              footer={
                peak
                  ? `${formatDateTime(peak.time)} · ${peakCategory?.label ?? ''}`
                  : 'No hourly data'
              }
            />
            <StatCard
              label="Mean PM2.5"
              value={pm25Stats.mean ?? '—'}
              unit="µg/m³"
              accentClass="text-orange-500"
              footer={
                pm25Stats.count > 0
                  ? `Range ${pm25Stats.min}–${pm25Stats.max} µg/m³`
                  : 'No hourly data'
              }
            />
            <StatCard
              label="Mean temperature"
              value={formatTemperature(tempStats.mean, settings.temperatureUnit, 1)}
              icon={<Thermometer className="h-4 w-4" aria-hidden />}
              accentClass="text-orange-500"
              footer={
                tempStats.count > 0
                  ? `Range ${formatTemperature(tempStats.min, settings.temperatureUnit, 0)}–${formatTemperature(tempStats.max, settings.temperatureUnit, 0)}`
                  : 'No hourly data'
              }
              origin={weather?.provenance.origin}
            />
          </>
        )}
      </div>

      {/* Air charts */}
      <Card>
        <CardHeader
          title="AQI over time"
          icon={<LineChartIcon className="h-4 w-4" aria-hidden />}
          subtitle={`US EPA AQI, last ${settings.historyWindowHours} hours.`}
        />
        <CardBody>
          {isLoading ? (
            <SkeletonBlock className="h-72" />
          ) : airQuality ? (
            <AqiTrendChart points={airQuality.hourly} height={320} />
          ) : (
            <EmptyState title="No data" description="AQI history is unavailable." />
          )}
        </CardBody>
        {airQuality ? <ProvenanceFooter provenance={airQuality.provenance} /> : null}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="PM2.5 trend" subtitle="Fine particulate matter, µg/m³." />
          <CardBody>
            {isLoading ? (
              <SkeletonBlock className="h-64" />
            ) : airQuality ? (
              <PollutantTrendChart points={airQuality.hourly} pollutants={['pm2_5']} />
            ) : (
              <EmptyState title="No data" description="PM2.5 history is unavailable." />
            )}
          </CardBody>
          {pm25Stats.count > 0 ? (
            <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Mean {pm25Stats.mean} µg/m³ · min {pm25Stats.min} · max {pm25Stats.max}
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="PM10 trend" subtitle="Coarse particulate matter, µg/m³." />
          <CardBody>
            {isLoading ? (
              <SkeletonBlock className="h-64" />
            ) : airQuality ? (
              <PollutantTrendChart points={airQuality.hourly} pollutants={['pm10']} />
            ) : (
              <EmptyState title="No data" description="PM10 history is unavailable." />
            )}
          </CardBody>
          {pm10Stats.count > 0 ? (
            <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Mean {pm10Stats.mean} µg/m³ · min {pm10Stats.min} · max {pm10Stats.max}
            </div>
          ) : null}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Temperature and humidity"
          icon={<Thermometer className="h-4 w-4" aria-hidden />}
          subtitle="Ambient conditions shape pollutant behaviour — heat drives ozone formation, and still, humid air lets particles accumulate."
        />
        <CardBody>
          {isLoading ? (
            <SkeletonBlock className="h-64" />
          ) : weather ? (
            <WeatherTrendChart points={weather.hourly} />
          ) : (
            <EmptyState title="No data" description="Weather history is unavailable." />
          )}
        </CardBody>
        {weather ? <ProvenanceFooter provenance={weather.provenance} /> : null}
      </Card>

      {/* Water charts */}
      <Card>
        <CardHeader
          title="Water quality trends"
          icon={<Droplets className="h-4 w-4" aria-hidden />}
          subtitle={
            measurements.length > 0
              ? `${measurements.length} recorded sample${measurements.length === 1 ? '' : 's'}. Average composite score ${waterAverage}/100.`
              : 'No samples recorded yet.'
          }
        />
        <CardBody>
          {measurements.length === 0 ? (
            <EmptyState
              icon={<Droplets className="h-6 w-6" aria-hidden />}
              title="No water samples to analyse"
              description="Record samples on the Water Quality page and their pH, turbidity and dissolved oxygen trends will appear here."
            />
          ) : (
            <div className="grid gap-6 xl:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  pH
                </h3>
                <WaterTrendChart measurements={measurements} series="ph" height={220} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Turbidity (NTU)
                </h3>
                <WaterTrendChart
                  measurements={measurements}
                  series="turbidity"
                  height={220}
                />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Dissolved oxygen (mg/L)
                </h3>
                <WaterTrendChart
                  measurements={measurements}
                  series="dissolvedOxygen"
                  height={220}
                />
              </div>
            </div>
          )}
        </CardBody>
        {measurements.length > 0 ? (
          <ProvenanceFooter
            provenance={{
              origin: waterOrigin.origin ?? 'user',
              sourceName: `Measurements stored in this browser — ${waterOrigin.summary}`,
              retrievedAt: new Date().toISOString(),
              observedAt: measurements[0]?.sampledAt,
              note: 'Manual entries, not sensor telemetry.',
            }}
          />
        ) : null}
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader title="How these figures are produced" />
        <CardBody>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <li>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Air and weather series:
              </span>{' '}
              requested from Open-Meteo with{' '}
              <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">
                past_days
              </code>{' '}
              covering the selected period. Forecast hours are discarded before
              charting, so every point is an observation up to the current hour.
            </li>
            <li>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Summary statistics:
              </span>{' '}
              minimum, maximum and mean are computed over exactly the points plotted,
              skipping hours where the provider returned no value. The hour count is
              shown so you can see how much data each figure rests on.
            </li>
            <li>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Water series:
              </span>{' '}
              plotted against the sample timestamps you entered. Because samples are
              irregular, points are drawn as markers; the connecting line is a visual
              aid only and does not imply readings between samples.
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
