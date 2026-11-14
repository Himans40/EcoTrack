/**
 * US EPA Air Quality Index (AQI) engine.
 *
 * ---------------------------------------------------------------------------
 * INDEX STANDARD
 * ---------------------------------------------------------------------------
 * This application reports **one** standard throughout: the United States
 * EPA AQI, as defined in EPA 454/B-24-002 ("Technical Assistance Document
 * for the Reporting of Daily Air Quality"). The PM2.5 breakpoints used here
 * are the revised values that took effect in May 2024.
 *
 * AQI thresholds differ between countries (India's CPCB NAQI, the European
 * EAQI and the US EPA AQI all classify the same air differently), so mixing
 * them would make the numbers meaningless. We therefore never blend scales:
 * the live AQI number comes from Open-Meteo's `us_aqi` field, and the
 * breakpoint maths below is used for pollutant sub-indices, for the
 * demonstration dataset, and as a fallback if `us_aqi` is absent.
 *
 * ---------------------------------------------------------------------------
 * UNIT HANDLING
 * ---------------------------------------------------------------------------
 * Open-Meteo returns every pollutant in µg/m³. EPA breakpoints for the
 * gaseous pollutants are defined in ppm (O3, CO) or ppb (NO2, SO2), so those
 * are converted first using the ideal-gas molar volume at 25 °C and 1 atm
 * (24.45 L/mol): ppb = µg/m³ × 24.45 / M.
 */

import type { AqiCategory, AqiCategoryKey, PollutantKey } from '@/types'

/* -------------------------------------------------------------------------- */
/*  Categories                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The six EPA AQI categories.
 *
 * `hex` values follow the official EPA colour scheme, darkened where needed
 * so that they stay legible as chart strokes and map markers on both light
 * and dark backgrounds (official "Moderate" yellow #FFFF00 is invisible on
 * white). `colorClass` holds contrast-checked Tailwind utilities for badges.
 */
export const AQI_CATEGORIES: AqiCategory[] = [
  {
    key: 'good',
    label: 'Good',
    range: [0, 50],
    colorClass:
      'bg-emerald-100 text-emerald-800 ring-emerald-600/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30',
    hex: '#16a34a',
    shortAdvice: 'Air quality is satisfactory. Outdoor activity is fine for everyone.',
    healthEffects:
      'Air pollution poses little or no risk at this level.',
  },
  {
    key: 'moderate',
    label: 'Moderate',
    range: [51, 100],
    colorClass:
      'bg-amber-100 text-amber-800 ring-amber-600/30 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30',
    hex: '#ca8a04',
    shortAdvice:
      'Acceptable for most people. Unusually sensitive individuals may want to limit long outdoor exertion.',
    healthEffects:
      'A small number of people who are unusually sensitive to air pollution may notice mild respiratory symptoms.',
  },
  {
    key: 'unhealthy-sensitive',
    label: 'Unhealthy for Sensitive Groups',
    range: [101, 150],
    colorClass:
      'bg-orange-100 text-orange-800 ring-orange-600/30 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-400/30',
    hex: '#ea580c',
    shortAdvice:
      'Sensitive groups — children, older adults, and people with heart or lung conditions — should reduce prolonged outdoor exertion.',
    healthEffects:
      'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
  },
  {
    key: 'unhealthy',
    label: 'Unhealthy',
    range: [151, 200],
    colorClass:
      'bg-red-100 text-red-800 ring-red-600/30 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/30',
    hex: '#dc2626',
    shortAdvice:
      'Everyone should reduce prolonged outdoor exertion. Sensitive groups should avoid it.',
    healthEffects:
      'Some members of the general public may experience health effects; sensitive groups may experience more serious effects.',
  },
  {
    key: 'very-unhealthy',
    label: 'Very Unhealthy',
    range: [201, 300],
    colorClass:
      'bg-purple-100 text-purple-800 ring-purple-600/30 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-400/30',
    hex: '#7e22ce',
    shortAdvice:
      'Avoid outdoor exertion. Keep windows closed and use filtration indoors if available.',
    healthEffects:
      'Health alert: the risk of health effects is increased for everyone.',
  },
  {
    key: 'hazardous',
    label: 'Hazardous',
    range: [301, 500],
    colorClass:
      'bg-rose-200 text-rose-900 ring-rose-700/30 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-300/30',
    hex: '#881337',
    shortAdvice: 'Stay indoors. Avoid all outdoor physical activity.',
    healthEffects:
      'Health warning of emergency conditions: everyone is more likely to be affected.',
  },
]

/** Highest AQI value the EPA scale defines. */
export const AQI_MAX = 500

/**
 * Resolve an AQI value to its EPA category.
 * Returns `null` for missing or nonsensical input rather than guessing.
 */
export function getAqiCategory(aqi: number | null | undefined): AqiCategory | null {
  if (aqi === null || aqi === undefined || !Number.isFinite(aqi) || aqi < 0) {
    return null
  }
  const found = AQI_CATEGORIES.find(
    (category) => aqi >= category.range[0] && aqi <= category.range[1],
  )
  // Anything above 500 is still an emergency; clamp to the top category.
  return found ?? AQI_CATEGORIES[AQI_CATEGORIES.length - 1]
}

export function getCategoryByKey(key: AqiCategoryKey): AqiCategory {
  const found = AQI_CATEGORIES.find((category) => category.key === key)
  if (!found) throw new Error(`Unknown AQI category key: ${key}`)
  return found
}

/* -------------------------------------------------------------------------- */
/*  Pollutant metadata                                                        */
/* -------------------------------------------------------------------------- */

export interface PollutantMeta {
  key: PollutantKey
  label: string
  shortLabel: string
  /** Chemical formula with unicode subscripts, for display. */
  formula: string
  /** Unit the provider reports, and the unit we display. */
  unit: string
  /** EPA averaging period the breakpoints assume. */
  averagingPeriod: string
  description: string
  sources: string
}

export const POLLUTANT_META: Record<PollutantKey, PollutantMeta> = {
  pm2_5: {
    key: 'pm2_5',
    label: 'Fine particulate matter',
    shortLabel: 'PM2.5',
    formula: 'PM₂.₅',
    unit: 'µg/m³',
    averagingPeriod: '24-hour average',
    description:
      'Airborne particles under 2.5 micrometres across. Small enough to reach deep into the lungs and pass into the bloodstream, which makes it the pollutant most strongly linked to health effects.',
    sources:
      'Vehicle exhaust, coal and biomass burning, construction dust, industrial emissions, crop-residue burning.',
  },
  pm10: {
    key: 'pm10',
    label: 'Coarse particulate matter',
    shortLabel: 'PM10',
    formula: 'PM₁₀',
    unit: 'µg/m³',
    averagingPeriod: '24-hour average',
    description:
      'Inhalable particles under 10 micrometres across, including dust and pollen. Irritates the airways and reduces visibility.',
    sources:
      'Road and construction dust, unpaved surfaces, quarrying, wind-blown soil, pollen.',
  },
  carbon_monoxide: {
    key: 'carbon_monoxide',
    label: 'Carbon monoxide',
    formula: 'CO',
    shortLabel: 'CO',
    unit: 'µg/m³',
    averagingPeriod: '8-hour average',
    description:
      'A colourless, odourless gas from incomplete combustion. It binds to haemoglobin and reduces how much oxygen the blood can carry.',
    sources:
      'Petrol engines, generators, indoor stoves and heaters, incomplete burning of any fuel.',
  },
  nitrogen_dioxide: {
    key: 'nitrogen_dioxide',
    label: 'Nitrogen dioxide',
    formula: 'NO₂',
    shortLabel: 'NO₂',
    unit: 'µg/m³',
    averagingPeriod: '1-hour average',
    description:
      'A reddish-brown traffic-related gas that inflames the airways and contributes to ozone and particulate formation.',
    sources:
      'Diesel and petrol vehicles, power generation, industrial boilers.',
  },
  sulphur_dioxide: {
    key: 'sulphur_dioxide',
    label: 'Sulphur dioxide',
    formula: 'SO₂',
    shortLabel: 'SO₂',
    unit: 'µg/m³',
    averagingPeriod: '1-hour average',
    description:
      'A sharp-smelling gas from sulphur-containing fuels. Triggers bronchoconstriction in people with asthma and forms acid rain.',
    sources:
      'Coal-fired power plants, smelting, oil refining, heavy fuel oil in shipping.',
  },
  ozone: {
    key: 'ozone',
    label: 'Ground-level ozone',
    formula: 'O₃',
    shortLabel: 'O₃',
    unit: 'µg/m³',
    averagingPeriod: '8-hour average',
    description:
      'Not emitted directly — it forms when sunlight reacts with nitrogen oxides and volatile organic compounds. Peaks on hot, sunny afternoons.',
    sources:
      'Secondary pollutant from vehicle and industrial emissions reacting in sunlight.',
  },
}

export const POLLUTANT_KEYS: PollutantKey[] = [
  'pm2_5',
  'pm10',
  'ozone',
  'nitrogen_dioxide',
  'sulphur_dioxide',
  'carbon_monoxide',
]

/* -------------------------------------------------------------------------- */
/*  Breakpoint tables                                                         */
/* -------------------------------------------------------------------------- */

/** `[concentrationLow, concentrationHigh, aqiLow, aqiHigh]` */
type Breakpoint = readonly [number, number, number, number]

interface BreakpointTable {
  /** Convert µg/m³ (the provider unit) into the unit the breakpoints use. */
  convert: (ugPerM3: number) => number
  /** Decimal places EPA requires the converted value be truncated to. */
  decimals: number
  /** Unit the breakpoints are expressed in, for documentation. */
  breakpointUnit: string
  bands: readonly Breakpoint[]
}

/**
 * Molar-volume conversion at 25 °C / 1 atm: ppb = µg/m³ × 24.45 / M.
 */
const MOLAR_VOLUME = 24.45
const toPpb = (molarMass: number) => (ugPerM3: number) =>
  (ugPerM3 * MOLAR_VOLUME) / molarMass
const toPpm = (molarMass: number) => (ugPerM3: number) =>
  (ugPerM3 * MOLAR_VOLUME) / molarMass / 1000

export const BREAKPOINTS: Record<PollutantKey, BreakpointTable> = {
  // PM2.5 — EPA revised breakpoints, effective May 2024.
  pm2_5: {
    convert: (v) => v,
    decimals: 1,
    breakpointUnit: 'µg/m³',
    bands: [
      [0, 9.0, 0, 50],
      [9.1, 35.4, 51, 100],
      [35.5, 55.4, 101, 150],
      [55.5, 125.4, 151, 200],
      [125.5, 225.4, 201, 300],
      [225.5, 325.4, 301, 500],
    ],
  },
  pm10: {
    convert: (v) => v,
    decimals: 0,
    breakpointUnit: 'µg/m³',
    bands: [
      [0, 54, 0, 50],
      [55, 154, 51, 100],
      [155, 254, 101, 150],
      [255, 354, 151, 200],
      [355, 424, 201, 300],
      [425, 604, 301, 500],
    ],
  },
  // O3 8-hour, ppm. EPA switches to the 1-hour table above 0.200 ppm;
  // we cap at the top of the 8-hour table and flag it as capped.
  ozone: {
    convert: toPpm(48.0),
    decimals: 3,
    breakpointUnit: 'ppm',
    bands: [
      [0, 0.054, 0, 50],
      [0.055, 0.07, 51, 100],
      [0.071, 0.085, 101, 150],
      [0.086, 0.105, 151, 200],
      [0.106, 0.2, 201, 300],
    ],
  },
  carbon_monoxide: {
    convert: toPpm(28.01),
    decimals: 1,
    breakpointUnit: 'ppm',
    bands: [
      [0, 4.4, 0, 50],
      [4.5, 9.4, 51, 100],
      [9.5, 12.4, 101, 150],
      [12.5, 15.4, 151, 200],
      [15.5, 30.4, 201, 300],
      [30.5, 50.4, 301, 500],
    ],
  },
  nitrogen_dioxide: {
    convert: toPpb(46.0055),
    decimals: 0,
    breakpointUnit: 'ppb',
    bands: [
      [0, 53, 0, 50],
      [54, 100, 51, 100],
      [101, 360, 101, 150],
      [361, 649, 151, 200],
      [650, 1249, 201, 300],
      [1250, 2049, 301, 500],
    ],
  },
  sulphur_dioxide: {
    convert: toPpb(64.066),
    decimals: 0,
    breakpointUnit: 'ppb',
    bands: [
      [0, 35, 0, 50],
      [36, 75, 51, 100],
      [76, 185, 101, 150],
      [186, 304, 151, 200],
      [305, 604, 201, 300],
      [605, 1004, 301, 500],
    ],
  },
}

/** EPA requires truncation (not rounding) before the breakpoint lookup. */
export function truncate(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.trunc(value * factor) / factor
}

/* -------------------------------------------------------------------------- */
/*  Sub-index calculation                                                     */
/* -------------------------------------------------------------------------- */

export interface SubIndexResult {
  aqi: number
  /** Value in the breakpoint unit after conversion and truncation. */
  convertedValue: number
  breakpointUnit: string
  /** True when the concentration exceeded the top of the table. */
  capped: boolean
}

/**
 * Compute the EPA sub-index for one pollutant from a µg/m³ concentration.
 *
 * Uses the EPA piecewise-linear formula:
 *   I = (I_hi - I_lo) / (BP_hi - BP_lo) × (C - BP_lo) + I_lo
 *
 * Returns `null` for missing or negative input — we never substitute a guess.
 */
export function calculateSubIndexDetailed(
  key: PollutantKey,
  ugPerM3: number | null | undefined,
): SubIndexResult | null {
  if (ugPerM3 === null || ugPerM3 === undefined) return null
  if (!Number.isFinite(ugPerM3) || ugPerM3 < 0) return null

  const table = BREAKPOINTS[key]
  const converted = truncate(table.convert(ugPerM3), table.decimals)

  for (const [bpLow, bpHigh, aqiLow, aqiHigh] of table.bands) {
    if (converted >= bpLow && converted <= bpHigh) {
      const aqi =
        ((aqiHigh - aqiLow) / (bpHigh - bpLow)) * (converted - bpLow) + aqiLow
      return {
        aqi: Math.round(aqi),
        convertedValue: converted,
        breakpointUnit: table.breakpointUnit,
        capped: false,
      }
    }
  }

  // Below the first band only happens for tiny negative rounding; above the
  // last band means the scale has been exceeded.
  const lastBand = table.bands[table.bands.length - 1]
  if (converted > lastBand[1]) {
    return {
      aqi: lastBand[3],
      convertedValue: converted,
      breakpointUnit: table.breakpointUnit,
      capped: true,
    }
  }
  return {
    aqi: 0,
    convertedValue: converted,
    breakpointUnit: table.breakpointUnit,
    capped: false,
  }
}

/** Convenience wrapper returning just the sub-index number. */
export function calculateSubIndex(
  key: PollutantKey,
  ugPerM3: number | null | undefined,
): number | null {
  return calculateSubIndexDetailed(key, ugPerM3)?.aqi ?? null
}

export interface OverallAqiResult {
  aqi: number | null
  dominantPollutant: PollutantKey | null
  subIndices: Partial<Record<PollutantKey, number>>
}

/**
 * Overall AQI is the **maximum** of the available pollutant sub-indices,
 * and the pollutant producing that maximum is the "dominant" pollutant.
 */
export function calculateOverallAqi(
  concentrations: Partial<Record<PollutantKey, number | null>>,
): OverallAqiResult {
  const subIndices: Partial<Record<PollutantKey, number>> = {}
  let max: number | null = null
  let dominant: PollutantKey | null = null

  for (const key of POLLUTANT_KEYS) {
    const sub = calculateSubIndex(key, concentrations[key])
    if (sub === null) continue
    subIndices[key] = sub
    if (max === null || sub > max) {
      max = sub
      dominant = key
    }
  }

  return { aqi: max, dominantPollutant: dominant, subIndices }
}

/**
 * Position of an AQI value along the 0-500 scale, as a 0-100 percentage.
 * Used by the gauge and the scale strip.
 */
export function aqiToScalePercent(aqi: number): number {
  return Math.min(100, Math.max(0, (aqi / AQI_MAX) * 100))
}
