/**
 * Tests for the Open-Meteo air quality client.
 *
 * `fetch` is mocked with a response shaped exactly like the real endpoint's
 * (verified against a live call), so these tests cover the two pieces of
 * logic that are easy to get wrong: discarding forecast hours, and converting
 * the provider's naive local timestamps into true UTC instants.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GeoLocation } from '@/types'
import { fetchAirQuality } from './airQuality'
import { ApiError, localTimeToUtcIso } from './http'

const LOCATION: GeoLocation = {
  id: 'geo_1273294',
  name: 'Delhi',
  latitude: 28.6519,
  longitude: 77.2315,
  country: 'India',
}

/** Indian Standard Time, UTC+05:30. */
const IST_OFFSET = 19_800

function buildResponse() {
  return {
    latitude: 28.65,
    longitude: 77.23,
    utc_offset_seconds: IST_OFFSET,
    timezone: 'Asia/Kolkata',
    current_units: {
      time: 'iso8601',
      us_aqi: 'USAQI',
      pm2_5: 'μg/m³',
    },
    current: {
      time: '2026-11-11T03:30',
      interval: 3600,
      us_aqi: 211,
      pm2_5: 141.6,
      pm10: 199.3,
      carbon_monoxide: 642,
      nitrogen_dioxide: 41.9,
      sulphur_dioxide: 17.8,
      ozone: 31,
    },
    hourly_units: { time: 'iso8601', us_aqi: 'USAQI' },
    hourly: {
      // Three observed hours, then two forecast hours beyond `current.time`.
      time: [
        '2026-11-11T01:00',
        '2026-11-11T02:00',
        '2026-11-11T03:00',
        '2026-11-11T04:00',
        '2026-11-11T05:00',
      ],
      us_aqi: [184, 186, 188, 190, 192],
      pm2_5: [120.1, 124.4, 128.9, 131, 133],
      pm10: [180, 185, 190, 195, 198],
      carbon_monoxide: [600, 610, 620, 630, 640],
      nitrogen_dioxide: [38, 39, 40, 41, 42],
      sulphur_dioxide: [15, 16, 17, 18, 19],
      ozone: [28, 29, 30, 31, 32],
    },
  }
}

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: 'OK',
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('localTimeToUtcIso', () => {
  it('subtracts the location offset to recover the true instant', () => {
    // 03:30 local in IST is 22:00 UTC on the previous day.
    expect(localTimeToUtcIso('2026-11-11T03:30', IST_OFFSET)).toBe(
      '2026-11-10T22:00:00.000Z',
    )
  })

  it('handles a zero offset and a negative offset', () => {
    expect(localTimeToUtcIso('2026-11-11T12:00', 0)).toBe('2026-11-11T12:00:00.000Z')
    // UTC-05:00
    expect(localTimeToUtcIso('2026-11-11T07:00', -18_000)).toBe(
      '2026-11-11T12:00:00.000Z',
    )
  })

  it('returns null for empty or unparseable input', () => {
    expect(localTimeToUtcIso('', IST_OFFSET)).toBeNull()
    expect(localTimeToUtcIso('not-a-time', IST_OFFSET)).toBeNull()
  })
})

describe('fetchAirQuality', () => {
  it('requests the US AQI field and all six pollutants', async () => {
    const fetchMock = mockFetchOnce(buildResponse())
    await fetchAirQuality(LOCATION, { historyHours: 24 })

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('us_aqi')
    expect(url).toContain('pm2_5')
    expect(url).toContain('pm10')
    expect(url).toContain('carbon_monoxide')
    expect(url).toContain('nitrogen_dioxide')
    expect(url).toContain('sulphur_dioxide')
    expect(url).toContain('ozone')
    expect(url).toContain('timezone=auto')
    expect(url).toContain('latitude=28.6519')
  })

  it('converts the requested history window into whole past days', async () => {
    const fetchMock = mockFetchOnce(buildResponse())
    await fetchAirQuality(LOCATION, { historyHours: 72 })
    expect(String(fetchMock.mock.calls[0][0])).toContain('past_days=3')

    vi.unstubAllGlobals()
    const fetchMock2 = mockFetchOnce(buildResponse())
    // 30 hours needs two days of history to cover it.
    await fetchAirQuality(LOCATION, { historyHours: 30 })
    expect(String(fetchMock2.mock.calls[0][0])).toContain('past_days=2')
  })

  it('reports the provider’s own us_aqi as the current index', async () => {
    mockFetchOnce(buildResponse())
    const dataset = await fetchAirQuality(LOCATION)
    expect(dataset.current.usAqi).toBe(211)
    expect(dataset.current.category?.key).toBe('very-unhealthy')
  })

  it('computes a sub-index for every pollutant and names the dominant one', async () => {
    mockFetchOnce(buildResponse())
    const dataset = await fetchAirQuality(LOCATION)

    expect(dataset.current.pollutants).toHaveLength(6)
    const pm25 = dataset.current.pollutants.find((p) => p.key === 'pm2_5')
    expect(pm25?.value).toBe(141.6)
    expect(pm25?.unit).toBe('µg/m³')
    expect(pm25?.subIndex).toBeGreaterThan(200)
    // PM2.5 at 141.6 µg/m³ outranks every other pollutant here.
    expect(dataset.current.dominantPollutant).toBe('pm2_5')
  })

  it('discards forecast hours so the history contains observations only', async () => {
    mockFetchOnce(buildResponse())
    const dataset = await fetchAirQuality(LOCATION)

    // 01:00, 02:00 and 03:00 are at or before current.time (03:30);
    // 04:00 and 05:00 are forecasts and must be dropped.
    expect(dataset.hourly).toHaveLength(3)
    expect(dataset.hourly.map((point) => point.time)).toEqual([
      '2026-11-11T01:00',
      '2026-11-11T02:00',
      '2026-11-11T03:00',
    ])
    expect(dataset.hourly.at(-1)?.usAqi).toBe(188)
  })

  it('trims the history to the requested number of hours', async () => {
    mockFetchOnce(buildResponse())
    const dataset = await fetchAirQuality(LOCATION, { historyHours: 2 })
    expect(dataset.hourly).toHaveLength(2)
    // Keeps the most recent hours, not the oldest.
    expect(dataset.hourly[0].time).toBe('2026-11-11T02:00')
  })

  it('tags the dataset as live API data with full provenance', async () => {
    mockFetchOnce(buildResponse())
    const dataset = await fetchAirQuality(LOCATION)

    expect(dataset.provenance.origin).toBe('api')
    expect(dataset.provenance.sourceName).toBe('Open-Meteo Air Quality API')
    expect(dataset.provenance.standard).toContain('US EPA AQI')
    expect(dataset.provenance.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    // The observation instant must be offset-corrected, not the naive string.
    expect(dataset.provenance.observedAt).toBe('2026-11-10T22:00:00.000Z')
  })

  it('keeps the naive local time for display alongside the UTC instant', async () => {
    mockFetchOnce(buildResponse())
    const dataset = await fetchAirQuality(LOCATION)
    // Chart labels use the location's own wall clock.
    expect(dataset.current.observedAt).toBe('2026-11-11T03:30')
  })

  it('falls back to computed breakpoints when us_aqi is absent', async () => {
    const body = buildResponse()
    delete (body.current as Record<string, unknown>).us_aqi
    mockFetchOnce(body)

    const dataset = await fetchAirQuality(LOCATION)
    // PM2.5 141.6 µg/m³ lands in the 201-300 band.
    expect(dataset.current.usAqi).toBeGreaterThan(200)
    expect(dataset.current.usAqi).toBeLessThanOrEqual(300)
  })

  it('returns null values rather than zeros when a pollutant is missing', async () => {
    const body = buildResponse()
    ;(body.current as Record<string, unknown>).sulphur_dioxide = null
    mockFetchOnce(body)

    const dataset = await fetchAirQuality(LOCATION)
    const so2 = dataset.current.pollutants.find((p) => p.key === 'sulphur_dioxide')
    expect(so2?.value).toBeNull()
    expect(so2?.subIndex).toBeNull()
  })

  it('copes with an empty hourly block', async () => {
    const body = buildResponse() as Record<string, unknown>
    delete body.hourly
    mockFetchOnce(body)

    const dataset = await fetchAirQuality(LOCATION)
    expect(dataset.hourly).toEqual([])
    // Current conditions still resolve.
    expect(dataset.current.usAqi).toBe(211)
  })

  it('raises an ApiError carrying the provider’s reason on a 4xx', async () => {
    mockFetchOnce(
      { error: true, reason: 'Latitude must be in range of -90 to 90°.' },
      { ok: false, status: 400 },
    )

    await expect(fetchAirQuality(LOCATION)).rejects.toThrowError(ApiError)
    await expect(fetchAirQuality(LOCATION)).rejects.toThrow(
      /Latitude must be in range/,
    )
  })

  it('raises a friendly ApiError when the network is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    await expect(fetchAirQuality(LOCATION)).rejects.toThrow(
      /Could not reach the data provider/,
    )
  })
})
