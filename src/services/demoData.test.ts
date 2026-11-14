/**
 * Tests for the demonstration dataset.
 *
 * The critical property is labelling: synthetic data must always be tagged
 * `origin: 'demo'` so the UI can never present it as a live observation.
 */

import { describe, expect, it } from 'vitest'
import type { GeoLocation } from '@/types'
import {
  buildDemoAirQuality,
  buildDemoWaterMeasurements,
  buildDemoWeather,
  DEMO_NOTE,
} from './demoData'
import { getAqiCategory } from '@/lib/aqi'
import { assessWaterMeasurement } from '@/lib/wqi'

const LOCATION: GeoLocation = {
  id: 'geo_test',
  name: 'Testville',
  latitude: 28.6519,
  longitude: 77.2315,
}

const OTHER_LOCATION: GeoLocation = {
  id: 'geo_other',
  name: 'Elsewhere',
  latitude: 12.9719,
  longitude: 77.5937,
}

describe('buildDemoAirQuality', () => {
  it('is labelled as demonstration data, never as live', () => {
    const dataset = buildDemoAirQuality(LOCATION, 24)
    expect(dataset.provenance.origin).toBe('demo')
    expect(dataset.provenance.sourceName).toMatch(/demonstration/i)
    expect(dataset.provenance.note).toBe(DEMO_NOTE)
    expect(DEMO_NOTE).toMatch(/NOT real measurements/i)
  })

  it('produces exactly the requested number of hourly points', () => {
    expect(buildDemoAirQuality(LOCATION, 24).hourly).toHaveLength(24)
    expect(buildDemoAirQuality(LOCATION, 72).hourly).toHaveLength(72)
  })

  it('is deterministic — the same location yields the same values', () => {
    const first = buildDemoAirQuality(LOCATION, 12)
    const second = buildDemoAirQuality(LOCATION, 12)
    expect(second.hourly.map((p) => p.pm2_5)).toEqual(
      first.hourly.map((p) => p.pm2_5),
    )
  })

  it('gives different cities different pollution profiles', () => {
    const a = buildDemoAirQuality(LOCATION, 12)
    const b = buildDemoAirQuality(OTHER_LOCATION, 12)
    expect(a.current.pollutants).not.toEqual(b.current.pollutants)
  })

  it('produces physically plausible, non-negative concentrations', () => {
    const dataset = buildDemoAirQuality(LOCATION, 48)
    for (const point of dataset.hourly) {
      expect(point.pm2_5).toBeGreaterThan(0)
      expect(point.pm10).toBeGreaterThan(0)
      // Coarse particulate includes the fine fraction, so PM10 >= PM2.5.
      expect(point.pm10 as number).toBeGreaterThan(point.pm2_5 as number)
      expect(point.ozone).toBeGreaterThan(0)
      expect(point.usAqi).toBeGreaterThan(0)
      expect(point.usAqi).toBeLessThanOrEqual(500)
    }
  })

  it('computes its AQI with the same EPA engine as the live path', () => {
    const dataset = buildDemoAirQuality(LOCATION, 24)
    // The current snapshot must agree with the last hourly point it came from.
    expect(dataset.current.usAqi).toBe(dataset.hourly.at(-1)?.usAqi)
    expect(dataset.current.category).toEqual(getAqiCategory(dataset.current.usAqi))
    expect(dataset.current.dominantPollutant).not.toBeNull()
  })

  it('timestamps hours in ascending order ending at the current hour', () => {
    const dataset = buildDemoAirQuality(LOCATION, 24)
    const times = dataset.hourly.map((p) => p.time)
    expect([...times].sort()).toEqual(times)
    expect(times.at(-1)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00$/)
  })
})

describe('buildDemoWeather', () => {
  it('is labelled as demonstration data', () => {
    expect(buildDemoWeather(LOCATION, 24).provenance.origin).toBe('demo')
  })

  it('produces plausible temperature and humidity ranges', () => {
    const dataset = buildDemoWeather(LOCATION, 48)
    expect(dataset.hourly).toHaveLength(48)
    for (const point of dataset.hourly) {
      expect(point.temperatureC as number).toBeGreaterThan(-20)
      expect(point.temperatureC as number).toBeLessThan(55)
      expect(point.relativeHumidity as number).toBeGreaterThanOrEqual(0)
      expect(point.relativeHumidity as number).toBeLessThanOrEqual(100)
    }
  })
})

describe('buildDemoWaterMeasurements', () => {
  it('flags every record as a demonstration sample', () => {
    const samples = buildDemoWaterMeasurements()
    expect(samples.length).toBeGreaterThan(0)
    for (const sample of samples) {
      expect(sample.isDemo).toBe(true)
    }
  })

  it('uses stable ids so loading twice cannot create duplicates', () => {
    const first = buildDemoWaterMeasurements()
    const second = buildDemoWaterMeasurements()
    expect(first.map((s) => s.id)).toEqual(second.map((s) => s.id))
    expect(new Set(first.map((s) => s.id)).size).toBe(first.length)
  })

  it('spans a range of water qualities so charts have something to show', () => {
    const scores = buildDemoWaterMeasurements().map(
      (sample) => assessWaterMeasurement(sample).score,
    )
    expect(Math.max(...scores) - Math.min(...scores)).toBeGreaterThan(30)
  })

  it('dates samples in the past, never the future', () => {
    const now = Date.now()
    for (const sample of buildDemoWaterMeasurements()) {
      expect(Date.parse(sample.sampledAt)).toBeLessThanOrEqual(now)
    }
  })
})
