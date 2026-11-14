import { describe, expect, it } from 'vitest'
import {
  celsiusToFahrenheit,
  formatCoordinates,
  formatDateTime,
  formatInteger,
  formatLocationName,
  formatNumber,
  formatRelativeTime,
  formatTemperature,
} from './format'

describe('formatNumber / formatInteger', () => {
  it('renders an em dash for missing values rather than 0 or NaN', () => {
    expect(formatNumber(null)).toBe('—')
    expect(formatNumber(undefined)).toBe('—')
    expect(formatNumber(Number.NaN)).toBe('—')
    expect(formatInteger(null)).toBe('—')
  })

  it('formats to the requested precision', () => {
    expect(formatNumber(7.449, 1)).toBe('7.4')
    expect(formatNumber(7.449, 2)).toBe('7.45')
    expect(formatNumber(0, 1)).toBe('0.0')
    expect(formatInteger(1234.6)).toBe('1,235')
  })
})

describe('temperature conversion', () => {
  it('converts Celsius to Fahrenheit at known reference points', () => {
    expect(celsiusToFahrenheit(0)).toBe(32)
    expect(celsiusToFahrenheit(100)).toBe(212)
    expect(celsiusToFahrenheit(-40)).toBe(-40)
  })

  it('formats with the right unit symbol', () => {
    expect(formatTemperature(25, 'celsius')).toBe('25.0°C')
    expect(formatTemperature(25, 'fahrenheit')).toBe('77.0°F')
    expect(formatTemperature(null, 'celsius')).toBe('—')
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-11-11T12:00:00.000Z')

  it('describes recent instants in minutes', () => {
    expect(formatRelativeTime('2026-11-11T12:00:00.000Z', now)).toBe('just now')
    expect(formatRelativeTime('2026-11-11T11:59:00.000Z', now)).toBe('1 minute ago')
    expect(formatRelativeTime('2026-11-11T11:48:00.000Z', now)).toBe('12 minutes ago')
  })

  it('switches to hours and days as the gap grows', () => {
    expect(formatRelativeTime('2026-11-11T11:00:00.000Z', now)).toBe('1 hour ago')
    expect(formatRelativeTime('2026-11-11T09:00:00.000Z', now)).toBe('3 hours ago')
    expect(formatRelativeTime('2026-11-10T12:00:00.000Z', now)).toBe('1 day ago')
    expect(formatRelativeTime('2026-11-07T12:00:00.000Z', now)).toBe('4 days ago')
  })

  it('treats a slightly future timestamp as "just now" rather than negative', () => {
    // The provider's "current hour" can be stamped just ahead of local time.
    expect(formatRelativeTime('2026-11-11T12:20:00.000Z', now)).toBe('just now')
  })

  it('reports unknown for missing or unparseable input', () => {
    expect(formatRelativeTime(null, now)).toBe('unknown')
    expect(formatRelativeTime('not a date', now)).toBe('unknown')
  })
})

describe('formatDateTime', () => {
  it('returns an em dash for invalid input', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('nonsense')).toBe('—')
  })

  it('formats a valid ISO instant', () => {
    expect(formatDateTime('2026-11-11T10:00:00.000Z')).toMatch(/2026/)
  })
})

describe('formatLocationName', () => {
  it('joins the available parts', () => {
    expect(
      formatLocationName({ name: 'Varanasi', admin1: 'Uttar Pradesh', country: 'India' }),
    ).toBe('Varanasi, Uttar Pradesh, India')
  })

  it('omits missing parts without leaving stray commas', () => {
    expect(formatLocationName({ name: 'Delhi', country: 'India' })).toBe('Delhi, India')
    expect(formatLocationName({ name: 'Delhi' })).toBe('Delhi')
  })

  it('collapses a duplicated city and region name', () => {
    // Several Indian cities share their name with their state/region.
    expect(
      formatLocationName({ name: 'Delhi', admin1: 'Delhi', country: 'India' }),
    ).toBe('Delhi, India')
  })
})

describe('formatCoordinates', () => {
  it('uses hemisphere letters rather than signs', () => {
    expect(formatCoordinates(28.6519, 77.2315)).toBe('28.6519° N, 77.2315° E')
    expect(formatCoordinates(-33.8688, -70.6693)).toBe('33.8688° S, 70.6693° W')
  })
})
