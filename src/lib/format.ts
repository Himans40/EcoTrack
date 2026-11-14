/** Display formatting helpers. All of them tolerate null input. */

import type { TemperatureUnit } from '@/types'

export function formatNumber(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return value.toFixed(decimals)
}

export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return Math.round(value).toLocaleString()
}

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32
}

/** Convert and format a Celsius value according to the user's unit setting. */
export function formatTemperature(
  celsius: number | null | undefined,
  unit: TemperatureUnit,
  decimals = 1,
): string {
  if (celsius === null || celsius === undefined || !Number.isFinite(celsius)) {
    return '—'
  }
  const value = unit === 'fahrenheit' ? celsiusToFahrenheit(celsius) : celsius
  return `${value.toFixed(decimals)}°${unit === 'fahrenheit' ? 'F' : 'C'}`
}

export function temperatureUnitSymbol(unit: TemperatureUnit): string {
  return unit === 'fahrenheit' ? '°F' : '°C'
}

/** e.g. "11 Nov 2026, 14:30" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** e.g. "11 Nov 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** e.g. "14:00" — used for chart axis ticks. */
export function formatHour(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Human "data freshness" string: "just now", "12 minutes ago", "3 hours ago".
 * `now` is injectable so the behaviour is deterministic under test.
 */
export function formatRelativeTime(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return 'unknown'
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 'unknown'

  const diffMs = now.getTime() - then.getTime()
  const diffMinutes = Math.round(diffMs / 60000)

  if (diffMinutes < 0) {
    // Provider timestamps can sit slightly in the future for the current hour.
    return 'just now'
  }
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes === 1) return '1 minute ago'
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours === 1) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

/** Compose "Delhi, Delhi, India" from the parts a geocoding hit provides. */
export function formatLocationName(location: {
  name: string
  admin1?: string
  country?: string
}): string {
  return [location.name, location.admin1, location.country]
    .filter((part): part is string => Boolean(part && part.trim()))
    .filter((part, index, all) => all.indexOf(part) === index)
    .join(', ')
}

export function formatCoordinates(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S'
  const lonDir = longitude >= 0 ? 'E' : 'W'
  return `${Math.abs(latitude).toFixed(4)}° ${latDir}, ${Math.abs(longitude).toFixed(4)}° ${lonDir}`
}
