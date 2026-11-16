/**
 * Settings page — appearance, units, refresh behaviour, data management and
 * data-source transparency.
 */

import { useState } from 'react'
import {
  Database,
  Download,
  FlaskConical,
  Monitor,
  Moon,
  RefreshCw,
  RotateCcw,
  Server,
  Sun,
  Thermometer,
  Trash2,
} from 'lucide-react'
import type { TemperatureUnit, ThemeMode } from '@/types'
import {
  DEFAULT_SETTINGS,
  HISTORY_WINDOW_OPTIONS,
  REFRESH_INTERVAL_OPTIONS,
  useSettings,
} from '@/context/SettingsContext'
import { useToast } from '@/context/ToastContext'
import { useLocations } from '@/context/LocationContext'
import { useWaterMeasurements } from '@/context/WaterContext'
import { useEnvironment } from '@/context/EnvironmentDataContext'
import { PageHeader } from '@/components/StatCard'
import { Button, Card, CardBody, CardHeader, DisclaimerNote } from '@/components/ui'
import {
  buildExportFilename,
  downloadTextFile,
  waterMeasurementsToCsv,
} from '@/lib/csv'
import { clearAppStorage, isStorageAvailable, STORAGE_KEYS } from '@/lib/storage'
import { AIR_QUALITY_SOURCE } from '@/services/airQuality'
import { WEATHER_SOURCE } from '@/services/weather'
import { GEOCODING_SOURCE } from '@/services/geocoding'
import { formatLocationName, formatRelativeTime } from '@/lib/format'

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const UNIT_OPTIONS: { value: TemperatureUnit; label: string }[] = [
  { value: 'celsius', label: 'Celsius (°C)' },
  { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
]

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings, resolvedTheme } = useSettings()
  const { activeLocation, savedLocations, selectLocation, resetLocations } =
    useLocations()
  const {
    measurements,
    loadDemoMeasurements,
    clearDemoMeasurements,
    deleteAllMeasurements,
    hasDemoMeasurements,
  } = useWaterMeasurements()
  const { refresh, isRefreshing, lastUpdatedAt, isDemoMode } = useEnvironment()

  const [confirmAction, setConfirmAction] = useState<
    'deleteAllWater' | 'resetEverything' | null
  >(null)

  const { showToast: announce } = useToast()

  const storageAvailable = isStorageAvailable()
  const demoCount = measurements.filter((m) => m.isDemo).length
  const userCount = measurements.length - demoCount

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Appearance, units, refresh behaviour, local data management and the data sources this application uses."
      />

      {!storageAvailable ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-400/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <p className="font-semibold">Local storage is unavailable</p>
          <p className="mt-0.5">
            This browser is blocking local storage (private browsing mode, or site data
            disabled). The application still works, but settings, saved locations and
            water measurements will not persist when you close the tab.
          </p>
        </div>
      ) : null}

      {/* Appearance */}
      <Card>
        <CardHeader
          title="Appearance"
          icon={<Sun className="h-4 w-4" aria-hidden />}
          subtitle={`Currently rendering in ${resolvedTheme} mode.`}
        />
        <CardBody className="space-y-4">
          <fieldset>
            <legend className="field-label">Theme</legend>
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon
                const isActive = settings.theme === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => updateSettings({ theme: option.value })}
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {option.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              “System” follows your operating system preference and updates live if you
              change it.
            </p>
          </fieldset>
        </CardBody>
      </Card>

      {/* Units & data */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Units"
            icon={<Thermometer className="h-4 w-4" aria-hidden />}
          />
          <CardBody className="space-y-4">
            <div>
              <label htmlFor="temperature-unit" className="field-label">
                Temperature unit
              </label>
              <select
                id="temperature-unit"
                value={settings.temperatureUnit}
                onChange={(event) =>
                  updateSettings({
                    temperatureUnit: event.target.value as TemperatureUnit,
                  })
                }
                className="field-input"
              >
                {UNIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Air temperature is fetched in Celsius and converted for display.
                Pollutant concentrations stay in µg/m³ and water parameters in their
                own standard units (NTU, mg/L, µS/cm), because those are the units the
                EPA breakpoints and the water guidance are defined in — converting them
                would make the thresholds wrong.
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Data refresh"
            icon={<RefreshCw className="h-4 w-4" aria-hidden />}
          />
          <CardBody className="space-y-4">
            <div>
              <label htmlFor="refresh-interval" className="field-label">
                Automatic refresh
              </label>
              <select
                id="refresh-interval"
                value={settings.refreshIntervalMinutes}
                onChange={(event) =>
                  updateSettings({
                    refreshIntervalMinutes: Number(event.target.value),
                  })
                }
                className="field-input"
              >
                {REFRESH_INTERVAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                The provider updates hourly, so refreshing more often than that returns
                the same values. Auto-refresh pauses while demonstration data is shown.
              </p>
            </div>

            <div>
              <label htmlFor="history-window" className="field-label">
                Chart history window
              </label>
              <select
                id="history-window"
                value={settings.historyWindowHours}
                onChange={(event) =>
                  updateSettings({ historyWindowHours: Number(event.target.value) })
                }
                className="field-input"
              >
                {HISTORY_WINDOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button variant="primary" onClick={refresh} isLoading={isRefreshing}>
                {!isRefreshing ? <RefreshCw className="h-4 w-4" aria-hidden /> : null}
                Refresh now
              </Button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {lastUpdatedAt
                  ? `Last loaded ${formatRelativeTime(lastUpdatedAt)}`
                  : 'Not loaded yet'}
                {isDemoMode ? ' · showing demonstration data' : ''}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Preferred location */}
      <Card>
        <CardHeader
          title="Preferred location"
          subtitle="The active location is loaded on startup and used by every page."
        />
        <CardBody className="space-y-3">
          <div>
            <label htmlFor="preferred-location" className="field-label">
              Active monitoring location
            </label>
            <select
              id="preferred-location"
              value={activeLocation.id}
              onChange={(event) => {
                const next = savedLocations.find(
                  (location) => location.id === event.target.value,
                )
                if (next) {
                  selectLocation(next)
                  announce(`Active location set to ${formatLocationName(next)}.`)
                }
              }}
              className="field-input"
            >
              {savedLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {formatLocationName(location)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {savedLocations.length} saved location
            {savedLocations.length === 1 ? '' : 's'}. Add more with “Add city” in the
            top bar; remove them from the location dropdown there.
          </p>
          <Button
            onClick={() => {
              resetLocations()
              announce('Saved locations reset to the defaults.')
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset saved locations
          </Button>
        </CardBody>
      </Card>

      {/* Local data */}
      <Card>
        <CardHeader
          title="Local data"
          icon={<Database className="h-4 w-4" aria-hidden />}
          subtitle="Everything this application stores lives in this browser only. Nothing is uploaded to any server."
        />
        <CardBody className="space-y-5">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
              <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Your water records
              </dt>
              <dd className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">
                {userCount}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
              <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Demonstration samples
              </dt>
              <dd className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">
                {demoCount}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
              <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Saved locations
              </dt>
              <dd className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">
                {savedLocations.length}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                if (measurements.length === 0) {
                  announce('There are no records to export.', 'error')
                  return
                }
                downloadTextFile(
                  buildExportFilename(),
                  waterMeasurementsToCsv(measurements),
                )
                announce(`Exported ${measurements.length} record(s) to CSV.`)
              }}
              disabled={measurements.length === 0}
            >
              <Download className="h-4 w-4" aria-hidden />
              Export all water records (CSV)
            </Button>

            <Button
              onClick={() => {
                const added = loadDemoMeasurements()
                announce(
                  added > 0
                    ? `Loaded ${added} demonstration sample(s).`
                    : 'Demonstration samples are already loaded.',
                )
              }}
            >
              <FlaskConical className="h-4 w-4" aria-hidden />
              Load demonstration samples
            </Button>

            {hasDemoMeasurements ? (
              <Button
                onClick={() => {
                  const removed = clearDemoMeasurements()
                  announce(`Removed ${removed} demonstration sample(s).`)
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Reset demonstration data
              </Button>
            ) : null}
          </div>

          {/* Destructive actions, each behind an explicit confirm step */}
          <div className="space-y-3 rounded-lg border border-red-300/60 bg-red-50/60 p-4 dark:border-red-500/30 dark:bg-red-500/5">
            <p className="text-sm font-semibold text-red-900 dark:text-red-300">
              Destructive actions
            </p>

            {confirmAction === 'deleteAllWater' ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-red-800 dark:text-red-300">
                  Delete all {measurements.length} water record(s)? This cannot be
                  undone.
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    deleteAllMeasurements()
                    setConfirmAction(null)
                    announce('All water records deleted.')
                  }}
                >
                  Yes, delete all
                </Button>
                <Button size="sm" onClick={() => setConfirmAction(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="danger"
                size="sm"
                disabled={measurements.length === 0}
                onClick={() => setConfirmAction('deleteAllWater')}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete all water records
              </Button>
            )}

            {confirmAction === 'resetEverything' ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-red-800 dark:text-red-300">
                  Clear all stored data — settings, saved locations and every water
                  record? This cannot be undone.
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    deleteAllMeasurements()
                    resetSettings()
                    resetLocations()
                    clearAppStorage()
                    setConfirmAction(null)
                    announce('All local application data cleared.')
                  }}
                >
                  Yes, clear everything
                </Button>
                <Button size="sm" onClick={() => setConfirmAction(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmAction('resetEverything')}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Clear all local data
              </Button>
            )}
          </div>

          <details className="rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-800">
            <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
              Storage keys used
            </summary>
            <ul className="mt-2 space-y-1 font-mono text-xs text-slate-500 dark:text-slate-400">
              {Object.entries(STORAGE_KEYS).map(([name, key]) => (
                <li key={key}>
                  {key} <span className="font-sans">({name})</span>
                </li>
              ))}
            </ul>
          </details>
        </CardBody>
      </Card>

      {/* Data sources */}
      <Card>
        <CardHeader
          title="Data sources and index standards"
          icon={<Server className="h-4 w-4" aria-hidden />}
          subtitle="Full transparency about where every number in this application comes from."
        />
        <CardBody className="space-y-4">
          <SourceRow
            name={AIR_QUALITY_SOURCE.name}
            url={AIR_QUALITY_SOURCE.url}
            provides="Air Quality Index (US EPA) and hourly concentrations of PM2.5, PM10, carbon monoxide, nitrogen dioxide, sulphur dioxide and ozone."
            notes={`Index standard: ${AIR_QUALITY_SOURCE.standard}. Values are modelled estimates from the CAMS atmospheric composition forecast interpolated to the chosen coordinates, not readings from a physical station at that exact point. No API key is required.`}
          />
          <SourceRow
            name={WEATHER_SOURCE.name}
            url={WEATHER_SOURCE.url}
            provides="Air temperature, relative humidity, wind speed and precipitation, current and hourly."
            notes="No API key is required."
          />
          <SourceRow
            name={GEOCODING_SOURCE.name}
            url={GEOCODING_SOURCE.url}
            provides="City name search, returning coordinates, country, region, timezone and population."
            notes="Backed by the GeoNames database. No API key is required."
          />
          <SourceRow
            name="OpenStreetMap raster tiles"
            url="https://www.openstreetmap.org/copyright"
            provides="The base map layer on the Environmental Map page."
            notes="© OpenStreetMap contributors, used under the Open Database Licence."
          />
          <SourceRow
            name="Your own measurements"
            provides="Every water quality parameter: pH, turbidity, dissolved oxygen, TDS, electrical conductivity and water temperature."
            notes="Entered manually by you and stored only in this browser. These are field or laboratory records, never sensor telemetry, and never described as live data anywhere in the interface."
          />
          <SourceRow
            name="Locally generated demonstration dataset"
            provides="Synthetic air quality, weather and water values used only when you explicitly choose them, or when you load the sample water records."
            notes="Generated by deterministic functions in the application itself. Always labelled with a prominent amber banner and an origin chip. Never mixed into a real API response and never used as a silent fallback."
          />

          <DisclaimerNote>
            This application is a college major project built for educational purposes.
            It is not a certified environmental monitoring instrument, and its output
            should not be used for regulatory, clinical or drinking-water safety
            decisions.
          </DisclaimerNote>
        </CardBody>
      </Card>

      {/* Reset settings */}
      <Card>
        <CardHeader title="Reset preferences" />
        <CardBody>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            Restore theme, units, refresh interval and history window to their defaults
            ({DEFAULT_SETTINGS.theme} theme, {DEFAULT_SETTINGS.temperatureUnit},{' '}
            {DEFAULT_SETTINGS.refreshIntervalMinutes}-minute refresh,{' '}
            {DEFAULT_SETTINGS.historyWindowHours}-hour history). Your water records and
            saved locations are not affected.
          </p>
          <Button
            onClick={() => {
              resetSettings()
              announce('Preferences restored to defaults.')
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset preferences
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}

function SourceRow({
  name,
  url,
  provides,
  notes,
}: {
  name: string
  url?: string
  provides: string
  notes: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-dotted hover:text-brand-600 dark:hover:text-brand-400"
          >
            {name}
          </a>
        ) : (
          name
        )}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <span className="font-medium">Provides:</span> {provides}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {notes}
      </p>
    </div>
  )
}
