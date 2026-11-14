/**
 * Tests for the persistence layer and its validators.
 *
 * The important behaviour here is defensive: a corrupt or outdated stored
 * value must fall back to the default instead of propagating into the app.
 */

import { describe, expect, it, vi } from 'vitest'
import {
  clearAppStorage,
  isArrayOf,
  isFiniteNumber,
  isNonEmptyString,
  isRecord,
  isStorageAvailable,
  readStorage,
  removeStorage,
  STORAGE_KEYS,
  writeStorage,
} from './storage'
import { isAppSettings, isGeoLocation, isWaterMeasurement } from './guards'
import { DEFAULT_SETTINGS } from '@/context/SettingsContext'

describe('isStorageAvailable', () => {
  it('detects the working storage provided by the test environment', () => {
    expect(isStorageAvailable()).toBe(true)
  })
})

describe('readStorage / writeStorage', () => {
  const key = 'ems.test.value'
  const isNumberArray = isArrayOf(isFiniteNumber)

  it('round-trips a value that passes validation', () => {
    expect(writeStorage(key, [1, 2, 3])).toBe(true)
    expect(readStorage(key, [], isNumberArray)).toEqual([1, 2, 3])
  })

  it('returns the fallback when nothing is stored', () => {
    expect(readStorage('ems.test.absent', [9], isNumberArray)).toEqual([9])
  })

  it('returns the fallback when the stored JSON is corrupt', () => {
    window.localStorage.setItem(key, '{not valid json')
    expect(readStorage(key, [7], isNumberArray)).toEqual([7])
  })

  it('returns the fallback when the stored value has the wrong shape', () => {
    // Simulates data written by an older version of the application.
    window.localStorage.setItem(key, JSON.stringify(['a', 'b']))
    expect(readStorage(key, [0], isNumberArray)).toEqual([0])
  })

  it('does not throw when storage itself rejects a write', () => {
    const setItem = vi
      .spyOn(window.localStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(writeStorage(key, [1])).toBe(false)
    expect(warn).toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('removes a single key', () => {
    writeStorage(key, [1])
    removeStorage(key)
    expect(window.localStorage.getItem(key)).toBeNull()
  })
})

describe('clearAppStorage', () => {
  it('clears this application’s keys and leaves unrelated keys alone', () => {
    Object.values(STORAGE_KEYS).forEach((key) =>
      window.localStorage.setItem(key, '"x"'),
    )
    window.localStorage.setItem('someone.elses.key', 'keep me')

    clearAppStorage()

    Object.values(STORAGE_KEYS).forEach((key) =>
      expect(window.localStorage.getItem(key)).toBeNull(),
    )
    expect(window.localStorage.getItem('someone.elses.key')).toBe('keep me')
  })
})

describe('primitive guards', () => {
  it('isRecord accepts plain objects only', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isRecord('x')).toBe(false)
  })

  it('isFiniteNumber rejects NaN, Infinity and numeric strings', () => {
    expect(isFiniteNumber(1.5)).toBe(true)
    expect(isFiniteNumber(0)).toBe(true)
    expect(isFiniteNumber(Number.NaN)).toBe(false)
    expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isFiniteNumber('3')).toBe(false)
  })

  it('isNonEmptyString rejects blank strings', () => {
    expect(isNonEmptyString('a')).toBe(true)
    expect(isNonEmptyString('  ')).toBe(false)
    expect(isNonEmptyString('')).toBe(false)
    expect(isNonEmptyString(5)).toBe(false)
  })
})

describe('isGeoLocation', () => {
  const valid = {
    id: 'geo_1',
    name: 'Delhi',
    latitude: 28.65,
    longitude: 77.23,
  }

  it('accepts a well-formed location', () => {
    expect(isGeoLocation(valid)).toBe(true)
  })

  it('rejects out-of-range coordinates', () => {
    expect(isGeoLocation({ ...valid, latitude: 120 })).toBe(false)
    expect(isGeoLocation({ ...valid, longitude: -400 })).toBe(false)
  })

  it('rejects missing or wrongly typed fields', () => {
    expect(isGeoLocation({ ...valid, id: '' })).toBe(false)
    expect(isGeoLocation({ ...valid, latitude: '28.65' })).toBe(false)
    expect(isGeoLocation(null)).toBe(false)
  })
})

describe('isAppSettings', () => {
  it('accepts the shipped defaults', () => {
    expect(isAppSettings(DEFAULT_SETTINGS)).toBe(true)
  })

  it('rejects an unknown theme or unit', () => {
    expect(isAppSettings({ ...DEFAULT_SETTINGS, theme: 'sepia' })).toBe(false)
    expect(isAppSettings({ ...DEFAULT_SETTINGS, temperatureUnit: 'kelvin' })).toBe(false)
  })

  it('rejects a negative refresh interval or zero history window', () => {
    expect(isAppSettings({ ...DEFAULT_SETTINGS, refreshIntervalMinutes: -5 })).toBe(false)
    expect(isAppSettings({ ...DEFAULT_SETTINGS, historyWindowHours: 0 })).toBe(false)
  })
})

describe('isWaterMeasurement', () => {
  const valid = {
    id: 'water_1',
    sampleLocation: 'Tap',
    sourceType: 'tap',
    sampledAt: '2026-11-10T10:00:00.000Z',
    ph: 7,
    turbidity: 1,
    dissolvedOxygen: 7,
    tds: 300,
    temperature: 22,
    conductivity: 400,
    createdAt: '2026-11-10T10:00:00.000Z',
    updatedAt: '2026-11-10T10:00:00.000Z',
  }

  it('accepts a complete record', () => {
    expect(isWaterMeasurement(valid)).toBe(true)
  })

  it('rejects a record missing a numeric parameter', () => {
    const { ph: _ph, ...withoutPh } = valid
    expect(isWaterMeasurement(withoutPh)).toBe(false)
  })

  it('rejects a parameter stored as a string', () => {
    expect(isWaterMeasurement({ ...valid, turbidity: '1.5' })).toBe(false)
  })

  it('rejects an unknown source type', () => {
    expect(isWaterMeasurement({ ...valid, sourceType: 'swimming-pool' })).toBe(false)
  })
})
