/**
 * Unit tests for the helper functions behind the newer features:
 * command menu, AQI alert, city comparison, forecast, live water score,
 * backend sync merge, server stats and AQI CSV export.
 */

import { describe, expect, it } from 'vitest'
import { Home } from 'lucide-react'
import type { AirQualityDataset, AirQualityHourlyPoint, GeoLocation, WaterMeasurement } from '@/types'
import { filterCommands, type Command } from '@/components/layout/CommandMenu'
import { isAboveAlertThreshold } from '@/components/layout/AqiAlertBanner'
import { sortByAqi, type CityComparisonRow } from '@/hooks/useCityComparison'
import { findForecastExtremes } from '@/components/air/AqiForecast'
import { lastDayOfReadings } from '@/components/air/AqiReading'
import { previewScore } from '@/components/water/WaterMeasurementForm'
import { mostCommonSource } from '@/components/ServerStats'
import { mergeWaterSamples } from '@/services/backend'
import { airHistoryToCsv } from '@/lib/csv'

/** An hourly point with only the AQI filled in. */
function hour(time: string, usAqi: number | null): AirQualityHourlyPoint {
  return {
    time,
    usAqi,
    pm2_5: null,
    pm10: null,
    carbon_monoxide: null,
    nitrogen_dioxide: null,
    sulphur_dioxide: null,
    ozone: null,
  }
}

describe('filterCommands', () => {
  const noop = () => {}
  const commands: Command[] = [
    { id: 'a', label: 'Go to Overview', group: 'Pages', icon: Home, run: noop },
    { id: 'b', label: 'Go to Water Quality', group: 'Pages', icon: Home, run: noop },
    { id: 'c', label: 'Use dark theme', group: 'Actions', icon: Home, run: noop },
  ]

  it('returns everything for an empty query', () => {
    expect(filterCommands(commands, '')).toHaveLength(3)
  })

  it('matches every typed word, in any order and case', () => {
    expect(filterCommands(commands, 'WATER go').map((c) => c.id)).toEqual(['b'])
  })

  it('returns nothing when no label matches', () => {
    expect(filterCommands(commands, 'rainfall')).toEqual([])
  })
})

describe('isAboveAlertThreshold', () => {
  it('is off when the threshold is 0', () => {
    expect(isAboveAlertThreshold(400, 0)).toBe(false)
  })

  it('only fires strictly above the threshold', () => {
    expect(isAboveAlertThreshold(150, 150)).toBe(false)
    expect(isAboveAlertThreshold(151, 150)).toBe(true)
  })

  it('ignores a missing reading', () => {
    expect(isAboveAlertThreshold(null, 100)).toBe(false)
  })
})

describe('sortByAqi', () => {
  const city = (id: string): GeoLocation => ({ id, name: id, latitude: 0, longitude: 0 })
  const row = (id: string, aqi: number | null): CityComparisonRow => ({
    location: city(id),
    data: aqi === null ? null : ({ current: { usAqi: aqi } } as AirQualityDataset),
    error: aqi === null ? 'failed' : null,
  })

  it('ranks cleanest first and puts missing readings last', () => {
    const sorted = sortByAqi([row('a', 160), row('b', null), row('c', 40)])
    expect(sorted.map((r) => r.location.id)).toEqual(['c', 'a', 'b'])
  })
})

describe('findForecastExtremes', () => {
  it('finds the best and worst forecast hour', () => {
    const result = findForecastExtremes([
      hour('2026-11-11T04:00', 120),
      hour('2026-11-11T05:00', 90),
      hour('2026-11-11T06:00', null),
      hour('2026-11-11T07:00', 140),
    ])
    expect(result?.best.time).toBe('2026-11-11T05:00')
    expect(result?.worst.time).toBe('2026-11-11T07:00')
  })

  it('returns null when there is no forecast', () => {
    expect(findForecastExtremes([])).toBeNull()
  })
})

describe('lastDayOfReadings', () => {
  it('keeps the newest 24 hours that have a value', () => {
    const points = Array.from({ length: 30 }, (_, i) => hour(`h${i}`, i === 29 ? null : i))
    const result = lastDayOfReadings(points)
    expect(result).toHaveLength(24)
    expect(result.at(-1)?.time).toBe('h28')
  })
})

describe('previewScore', () => {
  const filled = {
    sampleLocation: '',
    sourceType: 'tap' as const,
    sampledAt: '',
    latitude: '',
    longitude: '',
    notes: '',
    ph: '7.2',
    turbidity: '1',
    dissolvedOxygen: '8',
    tds: '200',
    conductivity: '300',
    temperature: '20',
  }

  it('scores a complete, valid set of parameters', () => {
    const result = previewScore(filled)
    expect(result?.score).toBeGreaterThan(85)
    expect(result?.concerns).toEqual([])
  })

  it('waits until every parameter is filled in', () => {
    expect(previewScore({ ...filled, tds: '' })).toBeNull()
  })

  it('rejects a value outside the allowed range', () => {
    expect(previewScore({ ...filled, ph: '15' })).toBeNull()
  })
})

describe('mergeWaterSamples', () => {
  const sample = (id: string, updatedAt: string, ph: number) =>
    ({ id, updatedAt, ph }) as WaterMeasurement

  it('keeps records from both sides and prefers the newer edit', () => {
    const local = [sample('a', '2026-11-12T00:00:00Z', 8), sample('b', '2026-11-10T00:00:00Z', 7)]
    const remote = [sample('a', '2026-11-11T00:00:00Z', 6), sample('c', '2026-11-10T00:00:00Z', 7)]
    const merged = mergeWaterSamples(local, remote)
    expect(merged.map((r) => r.id).sort()).toEqual(['a', 'b', 'c'])
    expect(merged.find((r) => r.id === 'a')?.ph).toBe(8)
  })
})

describe('mostCommonSource', () => {
  it('picks the source type with the most samples', () => {
    expect(mostCommonSource({ tap: 2, river: 5, lake: 1 })).toBe('river')
  })

  it('returns null when there are no samples', () => {
    expect(mostCommonSource({})).toBeNull()
  })
})

describe('airHistoryToCsv', () => {
  it('writes a header plus one row per hour, leaving gaps empty', () => {
    const csv = airHistoryToCsv([hour('2026-11-11T01:00', 150), hour('2026-11-11T02:00', null)])
    const lines = csv.trim().split('\r\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('US AQI')
    expect(lines[1].startsWith('2026-11-11T01:00,150,')).toBe(true)
    expect(lines[2]).toBe('2026-11-11T02:00,,,,,,,')
  })
})
