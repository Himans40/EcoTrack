import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_LOCATIONS, FALLBACK_LOCATION, searchLocations } from './geocoding'

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

describe('searchLocations', () => {
  const varanasi = {
    id: 1253405,
    name: 'Varanasi',
    latitude: 25.31668,
    longitude: 83.01041,
    country: 'India',
    country_code: 'IN',
    admin1: 'Uttar Pradesh',
    timezone: 'Asia/Kolkata',
    population: 1164404,
    elevation: 86,
  }

  it('maps a provider hit onto the application’s location shape', async () => {
    mockFetchOnce({ results: [varanasi] })
    const results = await searchLocations('Varanasi')

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      id: 'geo_1253405',
      name: 'Varanasi',
      latitude: 25.31668,
      longitude: 83.01041,
      country: 'India',
      countryCode: 'IN',
      admin1: 'Uttar Pradesh',
      population: 1164404,
    })
  })

  it('skips the request entirely for queries under two characters', async () => {
    const fetchMock = mockFetchOnce({ results: [varanasi] })
    expect(await searchLocations('V')).toEqual([])
    expect(await searchLocations(' ')).toEqual([])
    expect(await searchLocations('')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats no matches as an empty result, not an error', async () => {
    mockFetchOnce({})
    await expect(searchLocations('zzzzqqqq')).resolves.toEqual([])

    vi.unstubAllGlobals()
    mockFetchOnce({ results: [] })
    await expect(searchLocations('zzzzqqqq')).resolves.toEqual([])
  })

  it('trims the query and passes the result count through', async () => {
    const fetchMock = mockFetchOnce({ results: [varanasi] })
    await searchLocations('  Varanasi  ', { count: 3 })

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('name=Varanasi')
    expect(url).toContain('count=3')
    expect(url).toContain('language=en')
  })

  it('propagates a provider error', async () => {
    mockFetchOnce({ error: true, reason: 'Parameter name is required.' }, {
      ok: false,
      status: 400,
    })
    await expect(searchLocations('Delhi')).rejects.toThrow(/Parameter name is required/)
  })
})

describe('default locations', () => {
  it('ships real cities with coordinates inside valid ranges', () => {
    expect(DEFAULT_LOCATIONS.length).toBeGreaterThan(0)
    for (const location of DEFAULT_LOCATIONS) {
      expect(location.latitude).toBeGreaterThanOrEqual(-90)
      expect(location.latitude).toBeLessThanOrEqual(90)
      expect(location.longitude).toBeGreaterThanOrEqual(-180)
      expect(location.longitude).toBeLessThanOrEqual(180)
      expect(location.name.length).toBeGreaterThan(0)
      expect(location.id).toMatch(/^geo_\d+$/)
    }
  })

  it('uses unique ids so saved-location de-duplication works', () => {
    const ids = DEFAULT_LOCATIONS.map((location) => location.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('exposes a fallback that is one of the defaults', () => {
    expect(DEFAULT_LOCATIONS).toContain(FALLBACK_LOCATION)
  })
})
