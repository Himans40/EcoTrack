/**
 * Banner shown under the top bar while the active city's AQI is above the
 * alert threshold chosen in Settings. It can be dismissed; it comes back if
 * the city or the threshold changes.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, X } from 'lucide-react'
import { useEnvironment } from '@/context/EnvironmentDataContext'
import { useLocations } from '@/context/LocationContext'
import { useSettings } from '@/context/SettingsContext'
import { getAqiCategory } from '@/lib/aqi'

/** True when alerts are on and the AQI is above the threshold. */
export function isAboveAlertThreshold(aqi: number | null | undefined, threshold: number): boolean {
  return threshold > 0 && typeof aqi === 'number' && aqi > threshold
}

export function AqiAlertBanner() {
  const { airQuality } = useEnvironment()
  const { activeLocation } = useLocations()
  const { settings } = useSettings()
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)

  const aqi = airQuality?.current.usAqi
  const threshold = settings.aqiAlertThreshold
  // Dismissing hides the banner only for this city and threshold.
  const bannerKey = `${activeLocation.id}:${threshold}`

  if (!isAboveAlertThreshold(aqi, threshold) || dismissedKey === bannerKey) return null

  const category = getAqiCategory(aqi)

  return (
    <div
      role="alert"
      className="border-b px-4 py-2.5 text-sm sm:px-6 lg:px-8 print:hidden"
      style={{
        backgroundColor: `${category?.hex}14`,
        borderColor: `${category?.hex}40`,
      }}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-3">
        <BellRing className="h-4 w-4 shrink-0" style={{ color: category?.hex }} aria-hidden />
        <p className="flex-1 text-slate-800 dark:text-slate-100">
          <span className="font-semibold">
            AQI in {activeLocation.name} is {Math.round(aqi as number)}
          </span>
          , above your alert level of {threshold}. {category?.shortAdvice}{' '}
          <Link
            to="/settings"
            className="whitespace-nowrap text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            Change alert
          </Link>
        </p>
        <button
          type="button"
          onClick={() => setDismissedKey(bannerKey)}
          aria-label="Dismiss air quality alert"
          className="rounded p-1 text-slate-500 hover:bg-slate-900/5 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
