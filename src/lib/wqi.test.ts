/**
 * Tests for the water quality composite index.
 */

import { describe, expect, it } from 'vitest'
import type { WaterMeasurement } from '@/types'
import {
  assessParameter,
  assessWaterMeasurement,
  averageWaterScore,
  describeMeasurementOrigin,
  getWaterRating,
  interpolateScore,
  totalParameterWeight,
  WATER_PARAMETERS,
  WATER_PARAMETER_KEYS,
  WATER_SAFETY_DISCLAIMER,
} from './wqi'

/** Build a measurement, overriding only the fields a test cares about. */
function makeMeasurement(overrides: Partial<WaterMeasurement> = {}): WaterMeasurement {
  return {
    id: 'test_1',
    sampleLocation: 'Test tap',
    sourceType: 'tap',
    sampledAt: '2026-11-10T10:00:00.000Z',
    ph: 7.4,
    turbidity: 0.8,
    dissolvedOxygen: 7.1,
    tds: 268,
    temperature: 22.4,
    conductivity: 418,
    createdAt: '2026-11-10T10:00:00.000Z',
    updatedAt: '2026-11-10T10:00:00.000Z',
    ...overrides,
  }
}

describe('weighting scheme', () => {
  it('has weights that sum to exactly 1, so the score is a true 0-100', () => {
    expect(totalParameterWeight()).toBe(1)
  })

  it('defines metadata for every parameter key', () => {
    expect(WATER_PARAMETER_KEYS).toHaveLength(6)
    for (const key of WATER_PARAMETER_KEYS) {
      const meta = WATER_PARAMETERS[key]
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.max).toBeGreaterThan(meta.min)
      expect(meta.weight).toBeGreaterThan(0)
    }
  })
})

describe('interpolateScore', () => {
  const anchors = [
    [0, 0],
    [10, 100],
    [20, 50],
  ] as const

  it('returns anchor values exactly', () => {
    expect(interpolateScore(0, anchors)).toBe(0)
    expect(interpolateScore(10, anchors)).toBe(100)
    expect(interpolateScore(20, anchors)).toBe(50)
  })

  it('interpolates linearly between anchors', () => {
    expect(interpolateScore(5, anchors)).toBe(50)
    expect(interpolateScore(15, anchors)).toBe(75)
  })

  it('clamps outside the anchor range instead of extrapolating', () => {
    expect(interpolateScore(-100, anchors)).toBe(0)
    expect(interpolateScore(1000, anchors)).toBe(50)
  })

  it('returns 0 for non-finite input', () => {
    expect(interpolateScore(Number.NaN, anchors)).toBe(0)
  })
})

describe('assessParameter', () => {
  it('scores pH 100 across the whole acceptable band', () => {
    expect(assessParameter('ph', 6.5).subScore).toBe(100)
    expect(assessParameter('ph', 7.4).subScore).toBe(100)
    expect(assessParameter('ph', 8.5).subScore).toBe(100)
  })

  it('penalises acidic and alkaline pH symmetrically around the band', () => {
    const acidic = assessParameter('ph', 5.5)
    const alkaline = assessParameter('ph', 9.5)
    expect(acidic.subScore).toBe(45)
    expect(alkaline.subScore).toBe(45)
    expect(acidic.message).toMatch(/acidic/i)
    expect(alkaline.message).toMatch(/alkaline/i)
  })

  it('scores turbidity best at zero and worst when very cloudy', () => {
    expect(assessParameter('turbidity', 0).subScore).toBe(100)
    expect(assessParameter('turbidity', 1).subScore).toBe(100)
    expect(assessParameter('turbidity', 5).subScore).toBe(70)
    expect(assessParameter('turbidity', 100).subScore).toBe(0)
  })

  it('scores dissolved oxygen higher as it rises toward saturation', () => {
    expect(assessParameter('dissolvedOxygen', 0).subScore).toBe(0)
    expect(assessParameter('dissolvedOxygen', 4).subScore).toBe(40)
    expect(assessParameter('dissolvedOxygen', 6).subScore).toBe(75)
    expect(assessParameter('dissolvedOxygen', 8).subScore).toBe(100)
  })

  it('penalises both demineralised and saline TDS', () => {
    // Very low TDS (RO output) is penalised mildly, not treated as ideal.
    expect(assessParameter('tds', 0).subScore).toBe(85)
    expect(assessParameter('tds', 300).subScore).toBe(100)
    expect(assessParameter('tds', 2000).subScore).toBe(35)
    expect(assessParameter('tds', 42).message).toMatch(/low mineral content/i)
  })

  it('reports the acceptable range alongside every value', () => {
    expect(assessParameter('ph', 7).acceptable).toBe(WATER_PARAMETERS.ph.acceptable)
  })
})

describe('assessWaterMeasurement', () => {
  it('scores a clean municipal tap sample as excellent', () => {
    const assessment = assessWaterMeasurement(makeMeasurement())
    // Hand-computed: 100(.18) + 100(.22) + 88.8(.22) + 100(.18) + 100(.12) + 100(.08)
    expect(assessment.score).toBe(97.5)
    expect(assessment.rating).toBe('excellent')
    expect(assessment.label).toBe('Excellent')
    expect(assessment.concerns).toHaveLength(0)
    expect(assessment.parameters).toHaveLength(6)
  })

  it('scores a heavily polluted river sample as poor and names the concerns', () => {
    const assessment = assessWaterMeasurement(
      makeMeasurement({
        sampleLocation: 'Yamuna river',
        sourceType: 'river',
        ph: 8.9,
        turbidity: 34.5,
        dissolvedOxygen: 2.8,
        tds: 1180,
        conductivity: 1840,
        temperature: 26.9,
      }),
    )
    expect(assessment.score).toBe(47.3)
    expect(assessment.rating).toBe('poor')
    // Turbidity, DO, TDS and conductivity all fall outside their bands.
    expect(assessment.concerns).toHaveLength(4)
    const concernKeys = assessment.concerns.map((c) => c.key).sort()
    expect(concernKeys).toEqual([
      'conductivity',
      'dissolvedOxygen',
      'tds',
      'turbidity',
    ])
  })

  it('produces a score within 0-100 for extreme inputs at both ends', () => {
    const worst = assessWaterMeasurement(
      makeMeasurement({
        ph: 0,
        turbidity: 1000,
        dissolvedOxygen: 0,
        tds: 10000,
        conductivity: 20000,
        temperature: 80,
      }),
    )
    expect(worst.score).toBeGreaterThanOrEqual(0)
    expect(worst.score).toBeLessThan(10)
    expect(worst.rating).toBe('very-poor')

    const best = assessWaterMeasurement(
      makeMeasurement({
        ph: 7.2,
        turbidity: 0,
        dissolvedOxygen: 9,
        tds: 300,
        conductivity: 400,
        temperature: 18,
      }),
    )
    expect(best.score).toBe(100)
    expect(best.rating).toBe('excellent')
  })

  it('attaches a colour and label suitable for direct rendering', () => {
    const assessment = assessWaterMeasurement(makeMeasurement())
    expect(assessment.hex).toMatch(/^#[0-9a-f]{6}$/i)
    expect(assessment.colorClass).toContain('bg-')
  })
})

describe('getWaterRating', () => {
  it('maps scores to the five rating bands', () => {
    expect(getWaterRating(100).rating).toBe('excellent')
    expect(getWaterRating(85).rating).toBe('excellent')
    expect(getWaterRating(84.9).rating).toBe('good')
    expect(getWaterRating(70).rating).toBe('good')
    expect(getWaterRating(69.9).rating).toBe('fair')
    expect(getWaterRating(50).rating).toBe('fair')
    expect(getWaterRating(49.9).rating).toBe('poor')
    expect(getWaterRating(30).rating).toBe('poor')
    expect(getWaterRating(29.9).rating).toBe('very-poor')
    expect(getWaterRating(0).rating).toBe('very-poor')
  })

  it('clamps out-of-range scores', () => {
    expect(getWaterRating(140).rating).toBe('excellent')
    expect(getWaterRating(-20).rating).toBe('very-poor')
  })
})

describe('averageWaterScore', () => {
  it('returns null for an empty set rather than zero', () => {
    expect(averageWaterScore([])).toBeNull()
  })

  it('averages the composite scores of every sample', () => {
    const clean = makeMeasurement({ id: 'a' })
    const dirty = makeMeasurement({
      id: 'b',
      ph: 8.9,
      turbidity: 34.5,
      dissolvedOxygen: 2.8,
      tds: 1180,
      conductivity: 1840,
      temperature: 26.9,
    })
    const average = averageWaterScore([clean, dirty])
    // (97.5 + 47.3) / 2 = 72.4
    expect(average).toBe(72.4)
  })
})

describe('safety disclaimer', () => {
  it('states plainly that the score is not a potability determination', () => {
    expect(WATER_SAFETY_DISCLAIMER).toMatch(/not a drinking-water safety determination/i)
    expect(WATER_SAFETY_DISCLAIMER).toMatch(/bacteriological/i)
  })
})

describe('describeMeasurementOrigin', () => {
  const user = makeMeasurement({ id: 'u1' })
  const demo = makeMeasurement({ id: 'd1', isDemo: true })

  it('reports no origin for an empty set', () => {
    const result = describeMeasurementOrigin([])
    expect(result.origin).toBeUndefined()
    expect(result.summary).toMatch(/no samples/i)
  })

  it('labels an all-demonstration set as demo, never as the user’s data', () => {
    const result = describeMeasurementOrigin([demo, { ...demo, id: 'd2' }])
    expect(result.origin).toBe('demo')
    expect(result.demoCount).toBe(2)
    expect(result.userCount).toBe(0)
    expect(result.summary).toMatch(/demonstration samples/i)
  })

  it('labels an all-user set as user data', () => {
    const result = describeMeasurementOrigin([user])
    expect(result.origin).toBe('user')
    expect(result.summary).toBe('1 recorded by you')
  })

  it('states both counts for a mixed set', () => {
    const result = describeMeasurementOrigin([user, demo, { ...demo, id: 'd2' }])
    expect(result.origin).toBe('user')
    expect(result.userCount).toBe(1)
    expect(result.demoCount).toBe(2)
    expect(result.summary).toBe('1 recorded by you, 2 demonstration')
  })
})
