/**
 * Tests for the US EPA AQI engine.
 *
 * Boundary values are taken straight from the EPA breakpoint tables, so these
 * assertions are exact by definition rather than snapshots of our own output.
 */

import { describe, expect, it } from 'vitest'
import {
  AQI_CATEGORIES,
  calculateOverallAqi,
  calculateSubIndex,
  calculateSubIndexDetailed,
  getAqiCategory,
  getCategoryByKey,
  truncate,
  aqiToScalePercent,
} from './aqi'

describe('getAqiCategory', () => {
  it('maps each EPA band boundary to the right category', () => {
    expect(getAqiCategory(0)?.key).toBe('good')
    expect(getAqiCategory(50)?.key).toBe('good')
    expect(getAqiCategory(51)?.key).toBe('moderate')
    expect(getAqiCategory(100)?.key).toBe('moderate')
    expect(getAqiCategory(101)?.key).toBe('unhealthy-sensitive')
    expect(getAqiCategory(150)?.key).toBe('unhealthy-sensitive')
    expect(getAqiCategory(151)?.key).toBe('unhealthy')
    expect(getAqiCategory(200)?.key).toBe('unhealthy')
    expect(getAqiCategory(201)?.key).toBe('very-unhealthy')
    expect(getAqiCategory(300)?.key).toBe('very-unhealthy')
    expect(getAqiCategory(301)?.key).toBe('hazardous')
    expect(getAqiCategory(500)?.key).toBe('hazardous')
  })

  it('clamps values beyond the top of the scale to Hazardous', () => {
    expect(getAqiCategory(750)?.key).toBe('hazardous')
  })

  it('returns null rather than guessing for missing or invalid input', () => {
    expect(getAqiCategory(null)).toBeNull()
    expect(getAqiCategory(undefined)).toBeNull()
    expect(getAqiCategory(Number.NaN)).toBeNull()
    expect(getAqiCategory(-5)).toBeNull()
  })

  it('exposes six categories that tile 0-500 with no gaps or overlaps', () => {
    expect(AQI_CATEGORIES).toHaveLength(6)
    AQI_CATEGORIES.forEach((category, index) => {
      if (index === 0) {
        expect(category.range[0]).toBe(0)
        return
      }
      // Each band must start exactly one above the previous band's end.
      expect(category.range[0]).toBe(AQI_CATEGORIES[index - 1].range[1] + 1)
    })
    expect(AQI_CATEGORIES[5].range[1]).toBe(500)
  })

  it('looks a category up by key', () => {
    expect(getCategoryByKey('unhealthy').label).toBe('Unhealthy')
    expect(() => getCategoryByKey('nope' as never)).toThrow()
  })
})

describe('truncate', () => {
  it('truncates toward zero instead of rounding, as the EPA method requires', () => {
    expect(truncate(9.09, 1)).toBe(9)
    expect(truncate(9.19, 1)).toBe(9.1)
    expect(truncate(35.49, 1)).toBe(35.4)
    expect(truncate(53.9, 0)).toBe(53)
    expect(truncate(0.0159, 3)).toBe(0.015)
  })
})

describe('calculateSubIndex — particulates', () => {
  it('returns the exact AQI at every PM2.5 breakpoint boundary', () => {
    // EPA 2024 revised PM2.5 breakpoints.
    expect(calculateSubIndex('pm2_5', 0)).toBe(0)
    expect(calculateSubIndex('pm2_5', 9.0)).toBe(50)
    expect(calculateSubIndex('pm2_5', 9.1)).toBe(51)
    expect(calculateSubIndex('pm2_5', 35.4)).toBe(100)
    expect(calculateSubIndex('pm2_5', 35.5)).toBe(101)
    expect(calculateSubIndex('pm2_5', 55.4)).toBe(150)
    expect(calculateSubIndex('pm2_5', 55.5)).toBe(151)
    expect(calculateSubIndex('pm2_5', 125.4)).toBe(200)
    expect(calculateSubIndex('pm2_5', 125.5)).toBe(201)
    expect(calculateSubIndex('pm2_5', 225.4)).toBe(300)
    expect(calculateSubIndex('pm2_5', 225.5)).toBe(301)
    expect(calculateSubIndex('pm2_5', 325.4)).toBe(500)
  })

  it('interpolates linearly inside a PM2.5 band', () => {
    // Midpoint of the 9.1-35.4 band should sit near the middle of 51-100.
    const midConcentration = (9.1 + 35.4) / 2
    const result = calculateSubIndex('pm2_5', midConcentration)
    expect(result).toBeGreaterThan(74)
    expect(result).toBeLessThan(77)
  })

  it('returns the exact AQI at every PM10 breakpoint boundary', () => {
    expect(calculateSubIndex('pm10', 0)).toBe(0)
    expect(calculateSubIndex('pm10', 54)).toBe(50)
    expect(calculateSubIndex('pm10', 55)).toBe(51)
    expect(calculateSubIndex('pm10', 154)).toBe(100)
    expect(calculateSubIndex('pm10', 155)).toBe(101)
    expect(calculateSubIndex('pm10', 254)).toBe(150)
    expect(calculateSubIndex('pm10', 354)).toBe(200)
    expect(calculateSubIndex('pm10', 424)).toBe(300)
    expect(calculateSubIndex('pm10', 604)).toBe(500)
  })

  it('caps rather than extrapolating above the top of the table', () => {
    const detail = calculateSubIndexDetailed('pm2_5', 900)
    expect(detail?.aqi).toBe(500)
    expect(detail?.capped).toBe(true)
  })

  it('rejects missing and negative concentrations', () => {
    expect(calculateSubIndex('pm2_5', null)).toBeNull()
    expect(calculateSubIndex('pm2_5', undefined)).toBeNull()
    expect(calculateSubIndex('pm2_5', -1)).toBeNull()
    expect(calculateSubIndex('pm2_5', Number.NaN)).toBeNull()
  })
})

describe('calculateSubIndex — unit conversion for gases', () => {
  it('converts NO2 from µg/m³ to ppb before the lookup', () => {
    // 100 µg/m³ × 24.45 / 46.0055 = 53.15 ppb, truncated to 53 ppb,
    // which is exactly the top of the "Good" NO2 band.
    const detail = calculateSubIndexDetailed('nitrogen_dioxide', 100)
    expect(detail?.breakpointUnit).toBe('ppb')
    expect(detail?.convertedValue).toBe(53)
    expect(detail?.aqi).toBe(50)
  })

  it('converts SO2 from µg/m³ to ppb', () => {
    const detail = calculateSubIndexDetailed('sulphur_dioxide', 100)
    expect(detail?.breakpointUnit).toBe('ppb')
    // 100 × 24.45 / 64.066 = 38.16 ppb → truncated to 38, inside 36-75.
    expect(detail?.convertedValue).toBe(38)
    expect(detail?.aqi).toBeGreaterThan(50)
    expect(detail?.aqi).toBeLessThan(100)
  })

  it('converts CO from µg/m³ to ppm', () => {
    const detail = calculateSubIndexDetailed('carbon_monoxide', 5000)
    expect(detail?.breakpointUnit).toBe('ppm')
    // 5000 × 24.45 / 28.01 / 1000 = 4.36 ppm → truncated to 4.3 ppm.
    expect(detail?.convertedValue).toBe(4.3)
    expect(detail?.aqi).toBeLessThanOrEqual(50)
  })

  it('converts O3 from µg/m³ to ppm', () => {
    const detail = calculateSubIndexDetailed('ozone', 120)
    expect(detail?.breakpointUnit).toBe('ppm')
    // 120 × 24.45 / 48 / 1000 = 0.0611 ppm → truncated to 0.061,
    // which falls in the 0.055-0.070 "Moderate" band.
    expect(detail?.convertedValue).toBe(0.061)
    expect(detail?.aqi).toBeGreaterThan(50)
    expect(detail?.aqi).toBeLessThanOrEqual(100)
  })

  it('does not convert particulates, which are already in EPA units', () => {
    const detail = calculateSubIndexDetailed('pm2_5', 42.7)
    expect(detail?.breakpointUnit).toBe('µg/m³')
    expect(detail?.convertedValue).toBe(42.7)
  })
})

describe('calculateOverallAqi', () => {
  it('takes the maximum sub-index and names the dominant pollutant', () => {
    const result = calculateOverallAqi({
      pm2_5: 9.0, // sub-index 50
      pm10: 155, // sub-index 101  <- highest
      ozone: 10,
    })
    expect(result.aqi).toBe(101)
    expect(result.dominantPollutant).toBe('pm10')
    expect(result.subIndices.pm2_5).toBe(50)
    expect(result.subIndices.pm10).toBe(101)
  })

  it('never averages the sub-indices', () => {
    const result = calculateOverallAqi({ pm2_5: 9.0, pm10: 604 })
    // An average would be ~275; the maximum is the correct answer.
    expect(result.aqi).toBe(500)
  })

  it('skips pollutants with no reading instead of treating them as zero', () => {
    const result = calculateOverallAqi({ pm2_5: 35.4, pm10: null, ozone: undefined })
    expect(result.aqi).toBe(100)
    expect(result.dominantPollutant).toBe('pm2_5')
    expect(result.subIndices.pm10).toBeUndefined()
  })

  it('returns a null AQI when nothing at all is measurable', () => {
    const result = calculateOverallAqi({})
    expect(result.aqi).toBeNull()
    expect(result.dominantPollutant).toBeNull()
  })

  it('handles a realistic heavily polluted snapshot', () => {
    // Shape of a real Delhi winter reading.
    const result = calculateOverallAqi({
      pm2_5: 141.6,
      pm10: 199.3,
      carbon_monoxide: 642,
      nitrogen_dioxide: 41.9,
      sulphur_dioxide: 17.8,
      ozone: 31,
    })
    expect(result.dominantPollutant).toBe('pm2_5')
    expect(result.aqi).toBeGreaterThan(200)
    expect(getAqiCategory(result.aqi)?.key).toBe('very-unhealthy')
  })
})

describe('aqiToScalePercent', () => {
  it('maps the 0-500 scale onto 0-100% and clamps outside it', () => {
    expect(aqiToScalePercent(0)).toBe(0)
    expect(aqiToScalePercent(250)).toBe(50)
    expect(aqiToScalePercent(500)).toBe(100)
    expect(aqiToScalePercent(800)).toBe(100)
    expect(aqiToScalePercent(-10)).toBe(0)
  })
})
