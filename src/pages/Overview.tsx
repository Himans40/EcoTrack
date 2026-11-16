/**
 * Overview dashboard — the combined air, weather and water summary.
 */

import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Droplets,
  Gauge,
  MapPin,
  Thermometer,
  Waves,
  Wind,
} from 'lucide-react'
import { useEnvironment } from '@/context/EnvironmentDataContext'
import { useLocations } from '@/context/LocationContext'
import { useSettings } from '@/context/SettingsContext'
import { useWaterMeasurements } from '@/context/WaterContext'
import { AqiAdvice, AqiGauge, AqiScaleStrip } from '@/components/air'
import { AqiTrendChart } from '@/components/charts'
import { PageHeader, StatCard } from '@/components/StatCard'
import {
  Card,
  CardBody,
  CardHeader,
  DemoDataBanner,
  DisclaimerNote,
  EmptyState,
  ErrorState,
  ProvenanceFooter,
  SkeletonBlock,
  Button,
} from '@/components/ui'
import { POLLUTANT_META } from '@/lib/aqi'
import {
  assessWaterMeasurement,
  averageWaterScore,
  describeMeasurementOrigin,
  WATER_SAFETY_DISCLAIMER,
} from '@/lib/wqi'
import {
  formatCoordinates,
  formatDateTime,
  formatInteger,
  formatLocationName,
  formatNumber,
  formatRelativeTime,
  formatTemperature,
} from '@/lib/format'

export default function OverviewPage() {
  const { activeLocation } = useLocations()
  const { settings } = useSettings()
  const { measurements } = useWaterMeasurements()
  const {
    airQuality,
    weather,
    isLoading,
    error,
    isDemoMode,
    refresh,
    useDemoData,
    lastUpdatedAt,
  } = useEnvironment()

  const latestWater = measurements[0]
  const latestWaterAssessment = latestWater
    ? assessWaterMeasurement(latestWater)
    : null
  const averageScore = averageWaterScore(measurements)
  const waterOrigin = describeMeasurementOrigin(measurements)

  const dominant = airQuality?.current.dominantPollutant
  const dominantMeta = dominant ? POLLUTANT_META[dominant] : null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Environmental Overview"
        description={
          <>
            Current air quality, weather and recorded water samples for{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {formatLocationName(activeLocation)}
            </span>
            .
          </>
        }
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {formatCoordinates(activeLocation.latitude, activeLocation.longitude)}
          </span>
        }
      />

      {isDemoMode ? <DemoDataBanner /> : null}

      {error && !airQuality ? (
        <Card>
          <ErrorState message={error} onRetry={refresh} onUseDemo={useDemoData} />
        </Card>
      ) : null}

      {/* Metric tiles */}
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
              label="Air Quality Index"
              value={
                airQuality?.current.usAqi !== null &&
                airQuality?.current.usAqi !== undefined
                  ? Math.round(airQuality.current.usAqi)
                  : '—'
              }
              unit="US AQI"
              icon={<Gauge className="h-4 w-4" aria-hidden />}
              footer={airQuality?.current.category?.label ?? 'Unavailable'}
              origin={airQuality?.provenance.origin}
            />
            <StatCard
              label="Temperature"
              value={formatTemperature(
                weather?.current.temperatureC ?? null,
                settings.temperatureUnit,
                1,
              )}
              icon={<Thermometer className="h-4 w-4" aria-hidden />}
              accentClass="text-orange-500"
              footer={
                weather?.current.windSpeedKmh !== null &&
                weather?.current.windSpeedKmh !== undefined
                  ? `Wind ${formatNumber(weather.current.windSpeedKmh, 1)} km/h`
                  : 'Wind unavailable'
              }
              origin={weather?.provenance.origin}
            />
            <StatCard
              label="Relative Humidity"
              value={formatInteger(weather?.current.relativeHumidity ?? null)}
              unit="%"
              icon={<Droplets className="h-4 w-4" aria-hidden />}
              accentClass="text-water-500"
              footer={
                weather?.current.precipitationMm !== null &&
                weather?.current.precipitationMm !== undefined
                  ? `Precipitation ${formatNumber(weather.current.precipitationMm, 1)} mm`
                  : 'Precipitation unavailable'
              }
              origin={weather?.provenance.origin}
            />
            <StatCard
              label="Water Samples"
              value={measurements.length}
              unit={measurements.length === 1 ? 'record' : 'records'}
              icon={<Waves className="h-4 w-4" aria-hidden />}
              accentClass="text-water-600"
              footer={
                averageScore !== null
                  ? `Average score ${averageScore}/100 · ${waterOrigin.summary}`
                  : 'No samples recorded yet'
              }
              origin={waterOrigin.origin}
            />
          </>
        )}
      </div>

      {/* AQI detail + weather */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader
            title="Current Air Quality"
            icon={<Wind className="h-4 w-4" aria-hidden />}
            subtitle={
              airQuality?.current.observedAt
                ? `Observation hour ${formatDateTime(airQuality.current.observedAt)} (local time at the location)`
                : undefined
            }
          />
          <CardBody className="space-y-5">
            {isLoading ? (
              <SkeletonBlock className="h-56" />
            ) : airQuality ? (
              <>
                <AqiGauge aqi={airQuality.current.usAqi} />
                <AqiScaleStrip aqi={airQuality.current.usAqi} />
                {dominantMeta ? (
                  <p className="rounded-lg bg-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    <span className="font-semibold">Dominant pollutant:</span>{' '}
                    {dominantMeta.label} ({dominantMeta.formula}). This pollutant has
                    the highest EPA sub-index right now, so it is the one setting the
                    overall AQI.
                  </p>
                ) : null}
              </>
            ) : (
              <EmptyState
                title="Air quality unavailable"
                description="No air quality reading could be loaded for this location."
              />
            )}
          </CardBody>
          {airQuality ? <ProvenanceFooter provenance={airQuality.provenance} /> : null}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Air Quality Trend"
            subtitle={`US AQI over the last ${settings.historyWindowHours} hours, plotted against the provider's own hourly timestamps.`}
            actions={
              <Link
                to="/air-quality"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
              >
                Full air quality view
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <CardBody>
            {isLoading ? (
              <SkeletonBlock className="h-64" />
            ) : airQuality ? (
              <AqiTrendChart points={airQuality.hourly} />
            ) : (
              <EmptyState
                title="No trend data"
                description="Hourly history could not be loaded for this location."
              />
            )}
          </CardBody>
          {airQuality ? (
            <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <AqiAdvice aqi={airQuality.current.usAqi} />
            </div>
          ) : null}
        </Card>
      </div>

      {/* Water summary + observations */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Water Quality Summary"
            icon={<Droplets className="h-4 w-4" aria-hidden />}
            subtitle="Based on the samples you have recorded. These are manual entries, not sensor readings."
            actions={
              <Link
                to="/water-quality"
                className="inline-flex items-center gap-1 text-xs font-medium text-water-700 hover:underline dark:text-water-400"
              >
                Manage records
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <CardBody className="space-y-4">
            {latestWater && latestWaterAssessment ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {latestWater.sampleLocation}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Sampled {formatDateTime(latestWater.sampledAt)} ·{' '}
                      {formatRelativeTime(latestWater.sampledAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-3xl font-bold"
                      style={{ color: latestWaterAssessment.hex }}
                    >
                      {latestWaterAssessment.score}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {latestWaterAssessment.label} · composite /100
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {latestWaterAssessment.parameters.map((parameter) => (
                    <div
                      key={parameter.key}
                      className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                    >
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {parameter.label}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {parameter.value}
                        {parameter.unit ? (
                          <span className="ml-1 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            {parameter.unit}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </div>

                {latestWaterAssessment.concerns.length > 0 ? (
                  <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 dark:border-amber-400/30 dark:bg-amber-500/10">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      {latestWaterAssessment.concerns.length} parameter
                      {latestWaterAssessment.concerns.length === 1 ? '' : 's'} outside
                      the acceptable range
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-amber-800 dark:text-amber-300/90">
                      {latestWaterAssessment.concerns.map((concern) => (
                        <li key={concern.key}>
                          {concern.label}: {concern.value}
                          {concern.unit ? ` ${concern.unit}` : ''} (acceptable{' '}
                          {concern.acceptable})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <DisclaimerNote>{WATER_SAFETY_DISCLAIMER}</DisclaimerNote>
              </>
            ) : (
              <EmptyState
                icon={<Droplets className="h-6 w-6" aria-hidden />}
                title="No water samples recorded yet"
                description="There is no public real-time API covering arbitrary water bodies, so this module works from measurements you record yourself. Add your first sample to see it scored and charted."
                action={
                  <Link to="/water-quality">
                    <Button variant="primary">Record a water sample</Button>
                  </Link>
                }
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Environmental Observations" />
          <CardBody>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {buildObservations({
                aqi: airQuality?.current.usAqi ?? null,
                dominantLabel: dominantMeta?.shortLabel ?? null,
                temperatureC: weather?.current.temperatureC ?? null,
                humidity: weather?.current.relativeHumidity ?? null,
                waterConcerns: latestWaterAssessment?.concerns.length ?? null,
                sampleCount: measurements.length,
              }).map((observation) => (
                <li key={observation} className="flex gap-2.5">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                    aria-hidden
                  />
                  <span className="leading-relaxed">{observation}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {lastUpdatedAt
                ? `Data last loaded ${formatRelativeTime(lastUpdatedAt)}.`
                : 'Data has not loaded yet.'}
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

/**
 * Plain-language observations derived strictly from the values on screen.
 *
 * Every sentence is a restatement of a number we actually have — nothing is
 * inferred about health outcomes, and nothing is stated when the value is
 * missing.
 */
function buildObservations({
  aqi,
  dominantLabel,
  temperatureC,
  humidity,
  waterConcerns,
  sampleCount,
}: {
  aqi: number | null
  dominantLabel: string | null
  temperatureC: number | null
  humidity: number | null
  waterConcerns: number | null
  sampleCount: number
}): string[] {
  const observations: string[] = []

  if (aqi !== null) {
    if (aqi <= 50) {
      observations.push('Air quality is in the Good band — outdoor activity is fine for everyone.')
    } else if (aqi <= 100) {
      observations.push('Air quality is Moderate. Unusually sensitive people may prefer shorter outdoor exertion.')
    } else if (aqi <= 150) {
      observations.push('Air quality is Unhealthy for Sensitive Groups. Children, older adults and people with heart or lung conditions should cut back on prolonged outdoor exertion.')
    } else if (aqi <= 200) {
      observations.push('Air quality is Unhealthy. Everyone should reduce prolonged outdoor exertion today.')
    } else {
      observations.push('Air quality is Very Unhealthy or worse. Outdoor exertion should be avoided.')
    }
  } else {
    observations.push('No AQI value is currently available for this location.')
  }

  if (dominantLabel) {
    observations.push(`${dominantLabel} currently carries the highest sub-index, so it is driving the overall AQI.`)
  }

  if (temperatureC !== null && humidity !== null) {
    if (temperatureC >= 30 && humidity <= 40) {
      observations.push('Hot and dry conditions favour ozone formation and keep dust suspended for longer.')
    } else if (humidity >= 80) {
      observations.push('High humidity can aid particle growth and reduce visibility.')
    } else {
      observations.push(`Ambient conditions are ${temperatureC.toFixed(0)} °C at ${humidity.toFixed(0)}% relative humidity.`)
    }
  }

  if (sampleCount === 0) {
    observations.push('No water samples have been recorded, so no water assessment can be shown.')
  } else if (waterConcerns === 0) {
    observations.push('In your most recent water sample, every parameter sat inside its acceptable range.')
  } else if (waterConcerns !== null) {
    observations.push(`Your most recent water sample has ${waterConcerns} parameter${waterConcerns === 1 ? '' : 's'} outside the acceptable range.`)
  }

  return observations
}
