/**
 * Air Quality page — the full pollutant breakdown and trend view.
 */

import { useState } from 'react'
import { BookOpen, Gauge, Info, Wind } from 'lucide-react'
import type { PollutantKey } from '@/types'
import { useEnvironment } from '@/context/EnvironmentDataContext'
import { useLocations } from '@/context/LocationContext'
import { useSettings } from '@/context/SettingsContext'
import { AqiAdvice, AqiGauge, AqiScaleStrip, PollutantGrid } from '@/components/air'
import { AqiForecast } from '@/components/air/AqiForecast'
import { AqiTrendChart, PollutantTrendChart } from '@/components/charts'
import { PageHeader } from '@/components/StatCard'
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
  Badge,
} from '@/components/ui'
import {
  AIR_QUALITY_SOURCE,
} from '@/services/airQuality'
import {
  AQI_CATEGORIES,
  BREAKPOINTS,
  POLLUTANT_KEYS,
  POLLUTANT_META,
  calculateSubIndexDetailed,
} from '@/lib/aqi'
import { formatDateTime, formatLocationName, formatNumber } from '@/lib/format'
import { HISTORY_WINDOW_OPTIONS } from '@/context/SettingsContext'

/** Chart series presets offered in the trend card. */
const SERIES_PRESETS: { id: string; label: string; pollutants: PollutantKey[] }[] = [
  { id: 'particulates', label: 'Particulates (PM2.5 + PM10)', pollutants: ['pm2_5', 'pm10'] },
  { id: 'pm25', label: 'PM2.5 only', pollutants: ['pm2_5'] },
  { id: 'pm10', label: 'PM10 only', pollutants: ['pm10'] },
  {
    id: 'gases',
    label: 'Gases (O₃, NO₂, SO₂)',
    pollutants: ['ozone', 'nitrogen_dioxide', 'sulphur_dioxide'],
  },
  { id: 'co', label: 'Carbon monoxide', pollutants: ['carbon_monoxide'] },
]

export default function AirQualityPage() {
  const { activeLocation } = useLocations()
  const { settings, updateSettings } = useSettings()
  const { airQuality, isLoading, error, isDemoMode, refresh, useDemoData } =
    useEnvironment()

  const [seriesId, setSeriesId] = useState(SERIES_PRESETS[0].id)
  const activeSeries =
    SERIES_PRESETS.find((preset) => preset.id === seriesId) ?? SERIES_PRESETS[0]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Air Quality Monitoring"
        description={
          <>
            Live pollutant concentrations and US EPA AQI for{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {formatLocationName(activeLocation)}
            </span>
            , retrieved from the Open-Meteo Air Quality API.
          </>
        }
        actions={
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="whitespace-nowrap">History window</span>
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
        }
      />

      {isDemoMode ? <DemoDataBanner /> : null}

      {error && !airQuality ? (
        <Card>
          <ErrorState message={error} onRetry={refresh} onUseDemo={useDemoData} />
        </Card>
      ) : null}

      {/* Index standard notice */}
      <div className="flex items-start gap-3 rounded-xl border border-water-300/60 bg-water-50 px-4 py-3 text-sm text-water-900 dark:border-water-500/30 dark:bg-water-500/10 dark:text-water-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Index standard: US EPA AQI</p>
          <p className="mt-0.5 leading-relaxed text-water-800 dark:text-water-300/90">
            Every AQI number and category on this page follows the United States EPA
            scale ({AIR_QUALITY_SOURCE.standard}). AQI thresholds differ between
            countries — India's CPCB NAQI and the European EAQI classify the same air
            differently — so this application deliberately uses one standard
            throughout and never mixes classification thresholds.
          </p>
        </div>
      </div>

      {/* Gauge + advice */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Air Quality Index"
            icon={<Gauge className="h-4 w-4" aria-hidden />}
          />
          <CardBody className="space-y-5">
            {isLoading ? (
              <SkeletonBlock className="h-56" />
            ) : airQuality ? (
              <>
                <AqiGauge aqi={airQuality.current.usAqi} />
                <AqiScaleStrip aqi={airQuality.current.usAqi} />
              </>
            ) : (
              <EmptyState
                title="Unavailable"
                description="No AQI value could be loaded."
              />
            )}
          </CardBody>
          {airQuality ? <ProvenanceFooter provenance={airQuality.provenance} /> : null}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Health Guidance"
            subtitle="EPA category description for the current index value."
          />
          <CardBody className="space-y-4">
            {isLoading ? (
              <SkeletonBlock className="h-24" />
            ) : (
              <AqiAdvice aqi={airQuality?.current.usAqi ?? null} />
            )}

            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Measurement confidence &amp; freshness
              </p>
              <ul className="space-y-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                <li>
                  Values come from the CAMS atmospheric composition model served by
                  Open-Meteo, interpolated to these coordinates. They are modelled
                  estimates, not a reading from a physical station at this exact spot.
                </li>
                <li>
                  The series updates hourly. The observation hour shown is{' '}
                  {airQuality?.current.observedAt
                    ? formatDateTime(airQuality.current.observedAt)
                    : 'unavailable'}{' '}
                  in the location's own local time.
                </li>
                <li>
                  Sub-indices below are computed from the reported concentrations
                  using the EPA breakpoint tables. Where the provider's own{' '}
                  <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">us_aqi</code>{' '}
                  field differs slightly, the provider's value is what is shown as the
                  overall AQI.
                </li>
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Pollutants */}
      <Card>
        <CardHeader
          title="Pollutant Concentrations"
          icon={<Wind className="h-4 w-4" aria-hidden />}
          subtitle="All six pollutants are reported in µg/m³. The EPA sub-index on each card is derived from that concentration."
        />
        <CardBody>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {POLLUTANT_KEYS.map((key) => (
                <SkeletonBlock key={key} className="h-36" />
              ))}
            </div>
          ) : airQuality ? (
            <PollutantGrid snapshot={airQuality.current} order={POLLUTANT_KEYS} />
          ) : (
            <EmptyState
              title="No pollutant data"
              description="Concentrations could not be loaded for this location."
            />
          )}
        </CardBody>
      </Card>

      {/* Forecast */}
      {airQuality ? <AqiForecast forecast={airQuality.forecast} /> : null}

      {/* Trends */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="AQI History"
            subtitle={`Last ${settings.historyWindowHours} hours, using the provider's hourly timestamps.`}
          />
          <CardBody>
            {isLoading ? (
              <SkeletonBlock className="h-64" />
            ) : airQuality ? (
              <AqiTrendChart points={airQuality.hourly} />
            ) : (
              <EmptyState title="No history" description="Hourly data unavailable." />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Pollutant History"
            subtitle="Choose which pollutants to plot."
            actions={
              <select
                value={seriesId}
                onChange={(event) => setSeriesId(event.target.value)}
                aria-label="Select pollutant series"
                className="field-input w-auto py-1.5 text-xs"
              >
                {SERIES_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            }
          />
          <CardBody>
            {isLoading ? (
              <SkeletonBlock className="h-64" />
            ) : airQuality ? (
              <PollutantTrendChart
                points={airQuality.hourly}
                pollutants={activeSeries.pollutants}
              />
            ) : (
              <EmptyState title="No history" description="Hourly data unavailable." />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Category reference */}
      <Card>
        <CardHeader
          title="AQI Category Reference"
          icon={<BookOpen className="h-4 w-4" aria-hidden />}
          subtitle="The six US EPA categories, their numeric ranges and what they mean."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem]">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th scope="col" className="table-head">Range</th>
                <th scope="col" className="table-head">Category</th>
                <th scope="col" className="table-head">Health effects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {AQI_CATEGORIES.map((category) => {
                const isCurrent =
                  airQuality?.current.category?.key === category.key
                return (
                  <tr
                    key={category.key}
                    className={isCurrent ? 'bg-brand-50/60 dark:bg-brand-500/10' : ''}
                  >
                    <td className="table-cell font-mono text-xs">
                      {category.range[0]}–{category.range[1]}
                    </td>
                    <td className="table-cell">
                      <Badge className={category.colorClass}>{category.label}</Badge>
                      {isCurrent ? (
                        <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                          current
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {category.healthEffects}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sub-index working */}
      {airQuality ? (
        <Card>
          <CardHeader
            title="Sub-index Calculation"
            subtitle="How each reported concentration becomes an EPA sub-index — useful for verifying the maths by hand."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem]">
              <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="table-head">Pollutant</th>
                  <th scope="col" className="table-head">Reported</th>
                  <th scope="col" className="table-head">Converted (EPA unit)</th>
                  <th scope="col" className="table-head">Averaging period</th>
                  <th scope="col" className="table-head">Sub-index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {airQuality.current.pollutants.map((reading) => {
                  const meta = POLLUTANT_META[reading.key]
                  const detail = calculateSubIndexDetailed(reading.key, reading.value)
                  const table = BREAKPOINTS[reading.key]
                  return (
                    <tr key={reading.key}>
                      <td className="table-cell font-medium text-slate-900 dark:text-slate-100">
                        {meta.formula}
                      </td>
                      <td className="table-cell font-mono text-xs">
                        {formatNumber(reading.value, 1)} {meta.unit}
                      </td>
                      <td className="table-cell font-mono text-xs">
                        {detail
                          ? `${detail.convertedValue} ${detail.breakpointUnit}`
                          : '—'}
                        {table.breakpointUnit === meta.unit ? (
                          <span className="ml-1 text-slate-400">(no conversion)</span>
                        ) : null}
                      </td>
                      <td className="table-cell text-xs">{meta.averagingPeriod}</td>
                      <td className="table-cell font-mono text-xs">
                        {detail ? detail.aqi : '—'}
                        {detail?.capped ? (
                          <span className="ml-1 text-amber-600 dark:text-amber-400">
                            (scale capped)
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <CardBody className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Gaseous pollutants are converted from µg/m³ to ppm or ppb using the
              ideal-gas molar volume at 25 °C and 1 atm (24.45 L/mol) before the
              breakpoint lookup, because the EPA tables are defined in those units.
              Values are truncated, not rounded, as the EPA method requires. The
              overall AQI is the maximum of the sub-indices.
            </p>
            <div className="mt-3">
              <Button size="sm" onClick={refresh}>
                Refresh data
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
