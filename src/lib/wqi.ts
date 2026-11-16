/**
 * Water Quality Index (WQI) — weighted arithmetic composite.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS, AND WHAT IT IS NOT
 * ---------------------------------------------------------------------------
 * This module turns six manually measured parameters into a single 0-100
 * score so that samples can be compared with each other over time. It is an
 * **educational composite indicator built for this project**. The acceptable
 * ranges that drive the sub-scores are informed by widely published general
 * guidance — the WHO *Guidelines for Drinking-water Quality* and the Indian
 * standard IS 10500 for drinking water — but the weighting scheme is our own.
 *
 * It is NOT:
 *   - a regulatory or certified water quality index,
 *   - a determination that water is safe to drink,
 *   - a substitute for laboratory microbiological testing.
 *
 * Drinking-water safety cannot be established from these six physico-chemical
 * parameters at all. It additionally requires, at minimum, bacteriological
 * testing (E. coli / total coliforms), heavy metals (arsenic, lead, fluoride,
 * nitrate) and residual disinfectant, assessed against the standard that
 * applies locally. The UI repeats this caveat wherever a score is shown.
 */

import type {
  DataOrigin,
  WaterMeasurement,
  WaterParameterAssessment,
  WaterParameterKey,
  WaterQualityAssessment,
  WaterRating,
  WaterSourceType,
} from '@/types'

/* -------------------------------------------------------------------------- */
/*  Parameter metadata                                                        */
/* -------------------------------------------------------------------------- */

export interface WaterParameterMeta {
  key: WaterParameterKey
  label: string
  shortLabel: string
  unit: string
  /** Plausible input bounds, used for form validation. */
  min: number
  max: number
  step: number
  /** Range considered acceptable, shown to the user. */
  acceptable: string
  description: string
  /** Relative weight in the composite score. Weights sum to 1. */
  weight: number
}

export const WATER_PARAMETERS: Record<WaterParameterKey, WaterParameterMeta> = {
  ph: {
    key: 'ph',
    label: 'pH',
    shortLabel: 'pH',
    unit: '',
    min: 0,
    max: 14,
    step: 0.1,
    acceptable: '6.5 – 8.5',
    description:
      'How acidic or alkaline the water is, on a scale of 0 to 14. Values outside 6.5–8.5 corrode pipes, affect taste and harm aquatic life.',
    weight: 0.18,
  },
  turbidity: {
    key: 'turbidity',
    label: 'Turbidity',
    shortLabel: 'Turbidity',
    unit: 'NTU',
    min: 0,
    max: 1000,
    step: 0.1,
    acceptable: '≤ 5 NTU (≤ 1 preferred)',
    description:
      'Cloudiness caused by suspended particles, in Nephelometric Turbidity Units. High turbidity shelters microorganisms from disinfection.',
    weight: 0.22,
  },
  dissolvedOxygen: {
    key: 'dissolvedOxygen',
    label: 'Dissolved oxygen',
    shortLabel: 'DO',
    unit: 'mg/L',
    min: 0,
    max: 20,
    step: 0.1,
    acceptable: '≥ 6 mg/L',
    description:
      'Oxygen available to aquatic organisms. Low DO indicates organic pollution and cannot sustain most fish.',
    weight: 0.22,
  },
  tds: {
    key: 'tds',
    label: 'Total dissolved solids',
    shortLabel: 'TDS',
    unit: 'mg/L',
    min: 0,
    max: 10000,
    step: 1,
    acceptable: '≤ 500 mg/L desirable',
    description:
      'Combined mass of dissolved salts and minerals. Affects taste and indicates salinity or contamination.',
    weight: 0.18,
  },
  conductivity: {
    key: 'conductivity',
    label: 'Electrical conductivity',
    shortLabel: 'EC',
    unit: 'µS/cm',
    min: 0,
    max: 20000,
    step: 1,
    acceptable: '≤ 750 µS/cm',
    description:
      'How well water conducts electricity, which rises with dissolved ion content. A fast proxy for TDS.',
    weight: 0.12,
  },
  temperature: {
    key: 'temperature',
    label: 'Water temperature',
    shortLabel: 'Temp',
    unit: '°C',
    min: -5,
    max: 80,
    step: 0.1,
    acceptable: '10 – 25 °C',
    description:
      'Warmer water holds less dissolved oxygen and accelerates microbial growth, so temperature shapes every other reading.',
    weight: 0.08,
  },
}

export const WATER_PARAMETER_KEYS: WaterParameterKey[] = [
  'ph',
  'turbidity',
  'dissolvedOxygen',
  'tds',
  'conductivity',
  'temperature',
]

export const WATER_SOURCE_LABELS: Record<WaterSourceType, string> = {
  tap: 'Municipal tap',
  borewell: 'Borewell',
  well: 'Open well',
  river: 'River',
  lake: 'Lake',
  pond: 'Pond',
  canal: 'Canal',
  rainwater: 'Rainwater harvest',
  treated: 'Treated / RO output',
  other: 'Other',
}

/* -------------------------------------------------------------------------- */
/*  Sub-score curves                                                          */
/* -------------------------------------------------------------------------- */

/** `[measuredValue, score]` anchors, ascending by value. */
type Anchor = readonly [number, number]

/**
 * Piecewise-linear interpolation across anchor points, clamped at both ends.
 * This keeps the scoring curves readable and easy to justify in a viva.
 */
export function interpolateScore(value: number, anchors: readonly Anchor[]): number {
  if (!Number.isFinite(value)) return 0
  if (value <= anchors[0][0]) return anchors[0][1]
  const last = anchors[anchors.length - 1]
  if (value >= last[0]) return last[1]

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const [x0, y0] = anchors[i]
    const [x1, y1] = anchors[i + 1]
    if (value >= x0 && value <= x1) {
      if (x1 === x0) return y1
      return y0 + ((value - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return last[1]
}

/**
 * Scoring curves. Each returns 0-100 where 100 is ideal.
 *
 * The anchors encode the acceptable ranges documented above: a parameter
 * sitting inside its acceptable band scores 100, and the score falls away
 * as the reading moves further outside it.
 */
const SCORE_CURVES: Record<WaterParameterKey, readonly Anchor[]> = {
  // Neutral-to-slightly-alkaline is ideal; both extremes are penalised.
  ph: [
    [0, 0],
    [4, 10],
    [5.5, 45],
    [6.5, 100],
    [8.5, 100],
    [9.5, 45],
    [11, 10],
    [14, 0],
  ],
  // Lower is strictly better.
  turbidity: [
    [0, 100],
    [1, 100],
    [5, 70],
    [10, 45],
    [25, 20],
    [50, 5],
    [100, 0],
  ],
  // Higher is better, up to natural saturation.
  dissolvedOxygen: [
    [0, 0],
    [2, 15],
    [4, 40],
    [6, 75],
    [8, 100],
    [20, 100],
  ],
  // Very low TDS is demineralised and flat-tasting; high TDS is saline.
  tds: [
    [0, 85],
    [50, 95],
    [150, 100],
    [500, 100],
    [1000, 65],
    [2000, 35],
    [3000, 15],
    [5000, 0],
  ],
  conductivity: [
    [0, 90],
    [100, 100],
    [750, 100],
    [1500, 65],
    [2500, 40],
    [4000, 15],
    [6000, 0],
  ],
  temperature: [
    [0, 55],
    [5, 80],
    [10, 100],
    [25, 100],
    [30, 70],
    [35, 45],
    [45, 10],
    [60, 0],
  ],
}

/* -------------------------------------------------------------------------- */
/*  Ratings                                                                   */
/* -------------------------------------------------------------------------- */

interface RatingDefinition {
  rating: WaterRating
  label: string
  /** Inclusive lower bound of the composite score. */
  min: number
  colorClass: string
  hex: string
}

export const WATER_RATINGS: RatingDefinition[] = [
  {
    rating: 'excellent',
    label: 'Excellent',
    min: 85,
    colorClass:
      'bg-emerald-100 text-emerald-800 ring-emerald-600/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30',
    hex: '#578873',
  },
  {
    rating: 'good',
    label: 'Good',
    min: 70,
    colorClass:
      'bg-water-100 text-water-800 ring-water-600/30 dark:bg-water-500/15 dark:text-water-300 dark:ring-water-400/30',
    hex: '#3a76a8',
  },
  {
    rating: 'fair',
    label: 'Fair',
    min: 50,
    colorClass:
      'bg-amber-100 text-amber-800 ring-amber-600/30 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30',
    hex: '#c98a2b',
  },
  {
    rating: 'poor',
    label: 'Poor',
    min: 30,
    colorClass:
      'bg-orange-100 text-orange-800 ring-orange-600/30 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-400/30',
    hex: '#c2622d',
  },
  {
    rating: 'very-poor',
    label: 'Very poor',
    min: 0,
    colorClass:
      'bg-red-100 text-red-800 ring-red-600/30 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/30',
    hex: '#b4432f',
  },
]

export function getWaterRating(score: number): RatingDefinition {
  const clamped = Math.max(0, Math.min(100, score))
  const found = WATER_RATINGS.find((r) => clamped >= r.min)
  return found ?? WATER_RATINGS[WATER_RATINGS.length - 1]
}

/* -------------------------------------------------------------------------- */
/*  Per-parameter messages                                                    */
/* -------------------------------------------------------------------------- */

function messageFor(key: WaterParameterKey, value: number, subScore: number): string {
  const ok = subScore >= 70
  switch (key) {
    case 'ph':
      if (ok) return 'Within the 6.5–8.5 range considered acceptable.'
      return value < 6.5
        ? 'Acidic — below 6.5. Acidic water corrodes metal plumbing and can leach metals.'
        : 'Alkaline — above 8.5. Causes scaling, bitter taste and reduced disinfection efficiency.'
    case 'turbidity':
      if (subScore >= 95) return 'Very clear water, at or below 1 NTU.'
      if (ok) return 'Acceptable clarity, within the 5 NTU limit.'
      return 'Cloudy — above 5 NTU. Suspended particles can shield microorganisms from disinfection.'
    case 'dissolvedOxygen':
      if (ok) return 'Enough dissolved oxygen to support aquatic life.'
      return value < 4
        ? 'Severely depleted — below 4 mg/L. Indicates heavy organic pollution; most fish cannot survive.'
        : 'Low — under 6 mg/L. Suggests organic loading or elevated temperature.'
    case 'tds':
      if (value < 50) return 'Very low mineral content — typical of RO or distilled water, flat in taste.'
      if (ok) return 'Within the 500 mg/L desirable limit.'
      return 'Elevated dissolved solids. Affects taste and may indicate salinity or contamination.'
    case 'conductivity':
      if (ok) return 'Ion content consistent with good quality fresh water.'
      return 'High conductivity, indicating a heavy dissolved-ion load.'
    case 'temperature':
      if (ok) return 'In the typical 10–25 °C range.'
      return value > 25
        ? 'Warm — warm water holds less oxygen and speeds up microbial growth.'
        : 'Cold — unusual for ambient samples; confirm the reading and the time of collection.'
    default:
      return ''
  }
}

/* -------------------------------------------------------------------------- */
/*  Assessment                                                                */
/* -------------------------------------------------------------------------- */

const VALUE_ACCESSORS: Record<WaterParameterKey, (m: WaterMeasurement) => number> = {
  ph: (m) => m.ph,
  turbidity: (m) => m.turbidity,
  dissolvedOxygen: (m) => m.dissolvedOxygen,
  tds: (m) => m.tds,
  conductivity: (m) => m.conductivity,
  temperature: (m) => m.temperature,
}

/** Score one parameter in isolation. */
export function assessParameter(
  key: WaterParameterKey,
  value: number,
): WaterParameterAssessment {
  const meta = WATER_PARAMETERS[key]
  const subScore = Math.round(interpolateScore(value, SCORE_CURVES[key]) * 10) / 10
  return {
    key,
    label: meta.label,
    value,
    unit: meta.unit,
    subScore,
    rating: getWaterRating(subScore).rating,
    acceptable: meta.acceptable,
    message: messageFor(key, value, subScore),
  }
}

/**
 * Compute the weighted composite assessment for a sample.
 *
 * score = Σ (subScoreᵢ × weightᵢ)  — weights sum to 1, so the result is 0-100.
 */
export function assessWaterMeasurement(
  measurement: WaterMeasurement,
): WaterQualityAssessment {
  const parameters = WATER_PARAMETER_KEYS.map((key) =>
    assessParameter(key, VALUE_ACCESSORS[key](measurement)),
  )

  const weighted = parameters.reduce(
    (total, p) => total + p.subScore * WATER_PARAMETERS[p.key].weight,
    0,
  )
  const score = Math.round(weighted * 10) / 10
  const rating = getWaterRating(score)

  return {
    score,
    rating: rating.rating,
    label: rating.label,
    colorClass: rating.colorClass,
    hex: rating.hex,
    parameters,
    // "Concern" means the parameter sits outside its acceptable band.
    concerns: parameters.filter((p) => p.subScore < 70),
  }
}

/** Average composite score across a set of samples, or null when empty. */
export function averageWaterScore(measurements: WaterMeasurement[]): number | null {
  if (measurements.length === 0) return null
  const total = measurements.reduce(
    (sum, m) => sum + assessWaterMeasurement(m).score,
    0,
  )
  return Math.round((total / measurements.length) * 10) / 10
}

/** Verify at build/test time that the weighting scheme is normalised. */
export function totalParameterWeight(): number {
  return Number(
    WATER_PARAMETER_KEYS.reduce(
      (sum, key) => sum + WATER_PARAMETERS[key].weight,
      0,
    ).toFixed(10),
  )
}

/**
 * Describe where a set of records came from.
 *
 * A set made entirely of demonstration samples must not be badged as the
 * user's own data, and a mixed set has to say so, otherwise the origin chip
 * would quietly overstate how much of the data is real.
 */
export function describeMeasurementOrigin(measurements: WaterMeasurement[]): {
  origin: DataOrigin | undefined
  demoCount: number
  userCount: number
  summary: string
} {
  const demoCount = measurements.filter((record) => record.isDemo).length
  const userCount = measurements.length - demoCount

  if (measurements.length === 0) {
    return { origin: undefined, demoCount, userCount, summary: 'No samples recorded yet' }
  }
  if (userCount === 0) {
    return {
      origin: 'demo',
      demoCount,
      userCount,
      summary: `All ${demoCount} are demonstration samples`,
    }
  }
  if (demoCount === 0) {
    return {
      origin: 'user',
      demoCount,
      userCount,
      summary: `${userCount} recorded by you`,
    }
  }
  return {
    origin: 'user',
    demoCount,
    userCount,
    summary: `${userCount} recorded by you, ${demoCount} demonstration`,
  }
}

/**
 * The disclaimer shown anywhere a water score appears. Exported as a single
 * constant so the wording can never drift between pages.
 */
export const WATER_SAFETY_DISCLAIMER =
  'This score is an educational composite of six physico-chemical parameters that you entered manually. It is not a drinking-water safety determination. Establishing potability additionally requires bacteriological testing (E. coli / total coliforms), heavy metals and residual disinfectant, assessed against the standard that applies in your area.'
