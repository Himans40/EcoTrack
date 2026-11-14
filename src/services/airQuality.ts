/**
 * Open-Meteo Air Quality API client.
 *
 * Provider : Open-Meteo Air Quality API (https://open-meteo.com/en/docs/air-quality-api)
 * Licence  : free for non-commercial use, no API key required
 * Model    : CAMS global/European atmospheric composition forecasts
 * Index    : the `us_aqi` field, i.e. the United States EPA AQI
 *
 * Only ONE index standard is requested and displayed — US EPA AQI — so that
 * category thresholds can never be mixed between standards. See `lib/aqi.ts`.
 */

import type {
  AirQualityDataset,
  AirQualityHourlyPoint,
  AirQualitySnapshot,
  GeoLocation,
  PollutantKey,
  PollutantReading,
} from '@/types'
import {
  calculateSubIndex,
  getAqiCategory,
  POLLUTANT_KEYS,
  POLLUTANT_META,
  calculateOverallAqi,
} from '@/lib/aqi'
import { buildQuery, fetchJson, localTimeToUtcIso } from './http'

const API_BASE =
  import.meta.env.VITE_AIR_QUALITY_API_BASE ??
  'https://air-quality-api.open-meteo.com/v1/air-quality'

export const AIR_QUALITY_SOURCE = {
  name: 'Open-Meteo Air Quality API',
  url: 'https://open-meteo.com/en/docs/air-quality-api',
  standard: 'US EPA AQI (EPA 454/B-24-002, 2024 PM2.5 breakpoints)',
} as const

/** Raw response shape, mirroring what the endpoint actually returns. */
interface AirQualityResponse {
  latitude: number
  longitude: number
  utc_offset_seconds: number
  timezone: string
  elevation?: number
  current?: Record<string, number | string | null>
  current_units?: Record<string, string>
  hourly?: {
    time: string[]
    [key: string]: (number | null)[] | string[]
  }
  hourly_units?: Record<string, string>
}

const CURRENT_FIELDS = ['us_aqi', ...POLLUTANT_KEYS].join(',')
const HOURLY_FIELDS = ['us_aqi', ...POLLUTANT_KEYS].join(',')

export interface FetchAirQualityOptions {
  /** Hours of history to chart. Converted to whole `past_days`. */
  historyHours?: number
  signal?: AbortSignal
}

/**
 * Fetch current conditions plus hourly history for a location.
 *
 * Future forecast hours are discarded: the charts are labelled "historical",
 * so they must only contain observations up to the current hour.
 */
export async function fetchAirQuality(
  location: GeoLocation,
  { historyHours = 72, signal }: FetchAirQualityOptions = {},
): Promise<AirQualityDataset> {
  // The API takes whole days of history; round up to cover the window asked for.
  const pastDays = Math.min(92, Math.max(1, Math.ceil(historyHours / 24)))

  const query = buildQuery({
    latitude: location.latitude.toFixed(4),
    longitude: location.longitude.toFixed(4),
    current: CURRENT_FIELDS,
    hourly: HOURLY_FIELDS,
    past_days: pastDays,
    forecast_days: 1,
    timezone: 'auto',
  })

  const retrievedAt = new Date().toISOString()
  const raw = await fetchJson<AirQualityResponse>(`${API_BASE}?${query}`, { signal })

  const offset = raw.utc_offset_seconds ?? 0
  const currentLocalTime = (raw.current?.time as string | undefined) ?? null
  const observedAtUtc = currentLocalTime
    ? localTimeToUtcIso(currentLocalTime, offset)
    : null

  const current = parseSnapshot(raw, currentLocalTime)
  const hourly = parseHourly(raw, currentLocalTime, historyHours)

  return {
    location,
    current,
    hourly,
    provenance: {
      origin: 'api',
      sourceName: AIR_QUALITY_SOURCE.name,
      sourceUrl: AIR_QUALITY_SOURCE.url,
      standard: AIR_QUALITY_SOURCE.standard,
      retrievedAt,
      observedAt: observedAtUtc ?? undefined,
    },
  }
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseSnapshot(
  raw: AirQualityResponse,
  currentLocalTime: string | null,
): AirQualitySnapshot {
  const currentBlock = raw.current ?? {}

  const concentrations: Partial<Record<PollutantKey, number | null>> = {}
  const pollutants: PollutantReading[] = POLLUTANT_KEYS.map((key) => {
    const value = readNumber(currentBlock[key])
    concentrations[key] = value
    return {
      key,
      value,
      unit: POLLUTANT_META[key].unit,
      subIndex: calculateSubIndex(key, value),
    }
  })

  // Prefer the provider's own us_aqi. Only fall back to our breakpoint maths
  // when the field is missing, and never blend the two.
  const providerAqi = readNumber(currentBlock.us_aqi)
  const computed = calculateOverallAqi(concentrations)
  const usAqi = providerAqi ?? computed.aqi

  return {
    usAqi,
    category: getAqiCategory(usAqi),
    pollutants,
    dominantPollutant: computed.dominantPollutant,
    observedAt: currentLocalTime,
  }
}

function parseHourly(
  raw: AirQualityResponse,
  currentLocalTime: string | null,
  historyHours: number,
): AirQualityHourlyPoint[] {
  const block = raw.hourly
  if (!block || !Array.isArray(block.time)) return []

  const times = block.time as string[]
  const series = (key: string): (number | null)[] =>
    (block[key] as (number | null)[] | undefined) ?? []

  const usAqiSeries = series('us_aqi')
  const pm25Series = series('pm2_5')
  const pm10Series = series('pm10')
  const coSeries = series('carbon_monoxide')
  const no2Series = series('nitrogen_dioxide')
  const so2Series = series('sulphur_dioxide')
  const o3Series = series('ozone')

  const points: AirQualityHourlyPoint[] = times.map((time, index) => ({
    time,
    usAqi: readNumber(usAqiSeries[index]),
    pm2_5: readNumber(pm25Series[index]),
    pm10: readNumber(pm10Series[index]),
    carbon_monoxide: readNumber(coSeries[index]),
    nitrogen_dioxide: readNumber(no2Series[index]),
    sulphur_dioxide: readNumber(so2Series[index]),
    ozone: readNumber(o3Series[index]),
  }))

  // Drop forecast hours. Both timestamps are naive local strings in the same
  // timezone, and ISO-8601 sorts lexicographically, so a string compare is
  // exact here and avoids any timezone arithmetic.
  const observed = currentLocalTime
    ? points.filter((point) => point.time <= currentLocalTime)
    : points

  // Keep only the requested window, counting back from the newest hour.
  return observed.slice(-historyHours)
}
