/**
 * Open-Meteo Weather Forecast API client.
 *
 * Provider : https://open-meteo.com/en/docs
 * Licence  : free for non-commercial use, no API key required
 *
 * Supplies the ambient context the dashboard shows alongside air quality:
 * temperature, relative humidity, wind speed and precipitation. Temperature
 * and humidity matter environmentally, not just cosmetically — they drive
 * ozone formation and particulate dispersion.
 */

import type {
  GeoLocation,
  WeatherDataset,
  WeatherHourlyPoint,
  WeatherSnapshot,
} from '@/types'
import { buildQuery, fetchJson, localTimeToUtcIso } from './http'

const API_BASE =
  import.meta.env.VITE_WEATHER_API_BASE ?? 'https://api.open-meteo.com/v1/forecast'

export const WEATHER_SOURCE = {
  name: 'Open-Meteo Weather Forecast API',
  url: 'https://open-meteo.com/en/docs',
} as const

interface WeatherResponse {
  utc_offset_seconds: number
  current?: Record<string, number | string | null>
  hourly?: {
    time: string[]
    temperature_2m?: (number | null)[]
    relative_humidity_2m?: (number | null)[]
  }
}

export interface FetchWeatherOptions {
  historyHours?: number
  signal?: AbortSignal
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export async function fetchWeather(
  location: GeoLocation,
  { historyHours = 72, signal }: FetchWeatherOptions = {},
): Promise<WeatherDataset> {
  const pastDays = Math.min(92, Math.max(1, Math.ceil(historyHours / 24)))

  const query = buildQuery({
    latitude: location.latitude.toFixed(4),
    longitude: location.longitude.toFixed(4),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation',
    hourly: 'temperature_2m,relative_humidity_2m',
    past_days: pastDays,
    forecast_days: 1,
    timezone: 'auto',
  })

  const retrievedAt = new Date().toISOString()
  const raw = await fetchJson<WeatherResponse>(`${API_BASE}?${query}`, { signal })

  const offset = raw.utc_offset_seconds ?? 0
  const currentLocalTime = (raw.current?.time as string | undefined) ?? null

  const current: WeatherSnapshot = {
    temperatureC: readNumber(raw.current?.temperature_2m),
    relativeHumidity: readNumber(raw.current?.relative_humidity_2m),
    windSpeedKmh: readNumber(raw.current?.wind_speed_10m),
    precipitationMm: readNumber(raw.current?.precipitation),
    observedAt: currentLocalTime,
  }

  const times = raw.hourly?.time ?? []
  const allPoints: WeatherHourlyPoint[] = times.map((time, index) => ({
    time,
    temperatureC: readNumber(raw.hourly?.temperature_2m?.[index]),
    relativeHumidity: readNumber(raw.hourly?.relative_humidity_2m?.[index]),
  }))

  // Same reasoning as the air quality client: discard forecast hours so the
  // "historical" charts only contain observations.
  const observed = currentLocalTime
    ? allPoints.filter((point) => point.time <= currentLocalTime)
    : allPoints

  return {
    location,
    current,
    hourly: observed.slice(-historyHours),
    provenance: {
      origin: 'api',
      sourceName: WEATHER_SOURCE.name,
      sourceUrl: WEATHER_SOURCE.url,
      retrievedAt,
      observedAt: currentLocalTime
        ? (localTimeToUtcIso(currentLocalTime, offset) ?? undefined)
        : undefined,
    },
  }
}
