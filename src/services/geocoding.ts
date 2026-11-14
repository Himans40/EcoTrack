/**
 * Open-Meteo Geocoding API client — city search.
 *
 * Provider : https://open-meteo.com/en/docs/geocoding-api
 * Data     : GeoNames database
 * Licence  : free, no API key required
 */

import type { GeoLocation } from '@/types'
import { buildQuery, fetchJson } from './http'

const API_BASE =
  import.meta.env.VITE_GEOCODING_API_BASE ??
  'https://geocoding-api.open-meteo.com/v1/search'

export const GEOCODING_SOURCE = {
  name: 'Open-Meteo Geocoding API (GeoNames)',
  url: 'https://open-meteo.com/en/docs/geocoding-api',
} as const

interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  country_code?: string
  admin1?: string
  timezone?: string
  population?: number
  elevation?: number
}

interface GeocodingResponse {
  results?: GeocodingResult[]
  /** Present when the query was rejected. */
  error?: boolean
  reason?: string
}

export interface SearchLocationsOptions {
  count?: number
  signal?: AbortSignal
}

/**
 * Search for a city by name.
 *
 * Returns an empty array for a no-match query rather than throwing — "no
 * results" is a normal outcome the UI renders as an empty state, not an error.
 */
export async function searchLocations(
  query: string,
  { count = 8, signal }: SearchLocationsOptions = {},
): Promise<GeoLocation[]> {
  const trimmed = query.trim()
  // The endpoint requires at least two characters.
  if (trimmed.length < 2) return []

  const search = buildQuery({
    name: trimmed,
    count,
    language: 'en',
    format: 'json',
  })

  const raw = await fetchJson<GeocodingResponse>(`${API_BASE}?${search}`, { signal })
  if (!raw.results || raw.results.length === 0) return []

  return raw.results.map(toGeoLocation)
}

function toGeoLocation(result: GeocodingResult): GeoLocation {
  return {
    // GeoNames ids are globally unique and stable, which makes them a good
    // key for saved locations across sessions.
    id: `geo_${result.id}`,
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    country: result.country,
    countryCode: result.country_code,
    admin1: result.admin1,
    timezone: result.timezone,
    population: result.population,
    elevation: result.elevation,
  }
}

/**
 * Locations offered before the user searches for anything.
 *
 * These are real cities with fixed, verifiable coordinates — they are only a
 * convenience list, and every reading shown for them is still fetched live.
 */
export const DEFAULT_LOCATIONS: GeoLocation[] = [
  {
    id: 'geo_1273294',
    name: 'Delhi',
    latitude: 28.6519,
    longitude: 77.2315,
    country: 'India',
    countryCode: 'IN',
    admin1: 'Delhi',
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo_1275339',
    name: 'Mumbai',
    latitude: 19.07283,
    longitude: 72.88261,
    country: 'India',
    countryCode: 'IN',
    admin1: 'Maharashtra',
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo_1277333',
    name: 'Bengaluru',
    latitude: 12.97194,
    longitude: 77.59369,
    country: 'India',
    countryCode: 'IN',
    admin1: 'Karnataka',
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo_1264527',
    name: 'Chennai',
    latitude: 13.08784,
    longitude: 80.27847,
    country: 'India',
    countryCode: 'IN',
    admin1: 'Tamil Nadu',
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo_1275004',
    name: 'Kolkata',
    latitude: 22.56263,
    longitude: 88.36304,
    country: 'India',
    countryCode: 'IN',
    admin1: 'West Bengal',
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo_1253405',
    name: 'Varanasi',
    latitude: 25.31668,
    longitude: 83.01041,
    country: 'India',
    countryCode: 'IN',
    admin1: 'Uttar Pradesh',
    timezone: 'Asia/Kolkata',
  },
]

/** The location shown on first launch, before the user picks one. */
export const FALLBACK_LOCATION: GeoLocation = DEFAULT_LOCATIONS[0]
