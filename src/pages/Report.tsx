/**
 * Printable report — one page summarising air, weather and water for the
 * active city. The "Print or save as PDF" button opens the browser's print
 * dialog; the app chrome is hidden from print by `print:hidden` classes.
 */

import { Printer } from 'lucide-react'
import { useEnvironment } from '@/context/EnvironmentDataContext'
import { useLocations } from '@/context/LocationContext'
import { useSettings } from '@/context/SettingsContext'
import { useWaterMeasurements } from '@/context/WaterContext'
import { findForecastExtremes } from '@/components/air/AqiForecast'
import { Button } from '@/components/ui'
import { POLLUTANT_META } from '@/lib/aqi'
import { assessWaterMeasurement, WATER_SAFETY_DISCLAIMER, WATER_SOURCE_LABELS } from '@/lib/wqi'
import {
  formatCoordinates,
  formatDateTime,
  formatHour,
  formatInteger,
  formatLocationName,
  formatNumber,
  formatTemperature,
} from '@/lib/format'

/** How many recent water samples the report lists. */
const REPORT_SAMPLE_LIMIT = 10

export default function ReportPage() {
  const { activeLocation } = useLocations()
  const { settings } = useSettings()
  const { airQuality, weather, isDemoMode } = useEnvironment()
  const { measurements } = useWaterMeasurements()

  const aqi = airQuality?.current.usAqi ?? null
  const category = airQuality?.current.category
  const forecast = airQuality ? findForecastExtremes(airQuality.forecast) : null
  const samples = measurements.slice(0, REPORT_SAMPLE_LIMIT)

  return (
    <article className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-slate-800 sm:p-10 print:max-w-none print:border-0 print:p-0 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 print:dark:bg-white print:dark:text-slate-800">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <p className="text-sm text-slate-500">EcoTrack environmental report</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white print:dark:text-slate-900">
            {formatLocationName(activeLocation)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatCoordinates(activeLocation.latitude, activeLocation.longitude)} · Generated{' '}
            {formatDateTime(new Date().toISOString())}
          </p>
        </div>
        <Button variant="primary" onClick={() => window.print()} className="print:hidden">
          <Printer className="h-4 w-4" aria-hidden />
          Print or save as PDF
        </Button>
      </header>

      {isDemoMode ? (
        <p className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This report contains demonstration data, not real measurements.
        </p>
      ) : null}

      <ReportSection title="Air quality">
        <p className="text-[15px] leading-relaxed">
          The US AQI is <strong>{aqi === null ? 'unavailable' : Math.round(aqi)}</strong>
          {category ? ` (${category.label}). ${category.shortAdvice}` : '.'}
        </p>
        {forecast ? (
          <p className="mt-2 text-[15px] leading-relaxed">
            Over the next 24 hours the forecast is best at {formatHour(forecast.best.time)} (AQI{' '}
            {Math.round(forecast.best.usAqi ?? 0)}) and worst at {formatHour(forecast.worst.time)} (AQI{' '}
            {Math.round(forecast.worst.usAqi ?? 0)}).
          </p>
        ) : null}
        {airQuality ? (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                <th className="py-2 font-medium">Pollutant</th>
                <th className="py-2 text-right font-medium">Concentration</th>
                <th className="py-2 text-right font-medium">EPA sub-index</th>
              </tr>
            </thead>
            <tbody>
              {airQuality.current.pollutants.map((reading) => (
                <tr key={reading.key} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2">{POLLUTANT_META[reading.key].label}</td>
                  <td className="py-2 text-right">
                    {formatNumber(reading.value, 1)} {reading.unit}
                  </td>
                  <td className="py-2 text-right">{formatInteger(reading.subIndex)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </ReportSection>

      <ReportSection title="Weather">
        <p className="text-[15px] leading-relaxed">
          {weather
            ? `${formatTemperature(weather.current.temperatureC, settings.temperatureUnit, 1)}, ${formatInteger(weather.current.relativeHumidity)}% humidity, wind ${formatNumber(weather.current.windSpeedKmh, 1)} km/h, precipitation ${formatNumber(weather.current.precipitationMm, 1)} mm.`
            : 'Weather data is unavailable.'}
        </p>
      </ReportSection>

      <ReportSection title="Water samples">
        {samples.length === 0 ? (
          <p className="text-[15px]">No water samples have been recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                <th className="py-2 font-medium">Location</th>
                <th className="py-2 font-medium">Source</th>
                <th className="py-2 font-medium">Sampled</th>
                <th className="py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((sample) => {
                const assessment = assessWaterMeasurement(sample)
                return (
                  <tr key={sample.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2">{sample.sampleLocation}</td>
                    <td className="py-2">{WATER_SOURCE_LABELS[sample.sourceType]}</td>
                    <td className="py-2">{formatDateTime(sample.sampledAt)}</td>
                    <td className="py-2 text-right">
                      {assessment.score} · {assessment.label}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs leading-relaxed text-slate-500">{WATER_SAFETY_DISCLAIMER}</p>
      </ReportSection>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800">
        Air quality and weather from Open-Meteo. Water samples are entered manually by the
        user.
      </footer>
    </article>
  )
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white print:dark:text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  )
}
