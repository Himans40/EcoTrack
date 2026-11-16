/**
 * Shared domain types for the Environment Monitoring System.
 *
 * A central idea in this project is that every value shown in the UI carries
 * its own provenance, so the interface can never silently present a made-up
 * number as a real observation. `DataOrigin` is what makes that possible.
 */

/** Where a displayed value actually came from. Never fake "live". */
export type DataOrigin = 'api' | 'user' | 'demo'

/** Human-readable provenance metadata attached to every dataset. */
export interface DataProvenance {
  origin: DataOrigin
  /** Display name of the provider, e.g. "Open-Meteo Air Quality API". */
  sourceName: string
  /** Documentation or attribution URL for the provider. */
  sourceUrl?: string
  /** ISO timestamp of when the data was retrieved or recorded. */
  retrievedAt: string
  /** ISO timestamp of the most recent observation inside the dataset. */
  observedAt?: string
  /** Which index standard the values are classified against. */
  standard?: string
  /** Extra caveat shown next to the data. */
  note?: string
}

/* -------------------------------------------------------------------------- */
/*  Locations                                                                 */
/* -------------------------------------------------------------------------- */

export interface GeoLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  country?: string
  countryCode?: string
  admin1?: string
  timezone?: string
  population?: number
  elevation?: number
}

/* -------------------------------------------------------------------------- */
/*  Air quality                                                               */
/* -------------------------------------------------------------------------- */

/** Pollutants this application tracks. */
export type PollutantKey =
  | 'pm2_5'
  | 'pm10'
  | 'carbon_monoxide'
  | 'nitrogen_dioxide'
  | 'sulphur_dioxide'
  | 'ozone'

export interface PollutantReading {
  key: PollutantKey
  /** Concentration in the provider's native unit (µg/m³ for all six here). */
  value: number | null
  unit: string
  /** US EPA sub-index for this pollutant, when it can be computed. */
  subIndex: number | null
}

export interface AirQualitySnapshot {
  /** US EPA AQI as reported by the provider. */
  usAqi: number | null
  /** Category derived from `usAqi`. */
  category: AqiCategory | null
  pollutants: PollutantReading[]
  /** The pollutant with the highest sub-index — the one driving the AQI. */
  dominantPollutant: PollutantKey | null
  observedAt: string | null
}

export interface AirQualityHourlyPoint {
  time: string
  usAqi: number | null
  pm2_5: number | null
  pm10: number | null
  carbon_monoxide: number | null
  nitrogen_dioxide: number | null
  sulphur_dioxide: number | null
  ozone: number | null
}

export interface AirQualityDataset {
  location: GeoLocation
  current: AirQualitySnapshot
  /** Observed hours only, oldest first. */
  hourly: AirQualityHourlyPoint[]
  /** Model forecast for the coming hours, kept apart from observations. */
  forecast: AirQualityHourlyPoint[]
  provenance: DataProvenance
}

/** The six official US EPA AQI categories. */
export type AqiCategoryKey =
  | 'good'
  | 'moderate'
  | 'unhealthy-sensitive'
  | 'unhealthy'
  | 'very-unhealthy'
  | 'hazardous'

export interface AqiCategory {
  key: AqiCategoryKey
  label: string
  range: [number, number]
  /** Tailwind utility classes for chips and badges. */
  colorClass: string
  /** Raw hex colour, used by charts and the map where CSS classes don't apply. */
  hex: string
  shortAdvice: string
  healthEffects: string
}

/* -------------------------------------------------------------------------- */
/*  Weather / environmental conditions                                        */
/* -------------------------------------------------------------------------- */

export interface WeatherSnapshot {
  temperatureC: number | null
  relativeHumidity: number | null
  windSpeedKmh: number | null
  precipitationMm: number | null
  observedAt: string | null
}

export interface WeatherHourlyPoint {
  time: string
  temperatureC: number | null
  relativeHumidity: number | null
}

export interface WeatherDataset {
  location: GeoLocation
  current: WeatherSnapshot
  hourly: WeatherHourlyPoint[]
  provenance: DataProvenance
}

/* -------------------------------------------------------------------------- */
/*  Water quality                                                             */
/* -------------------------------------------------------------------------- */

export type WaterParameterKey =
  | 'ph'
  | 'turbidity'
  | 'dissolvedOxygen'
  | 'tds'
  | 'temperature'
  | 'conductivity'

export type WaterSourceType =
  | 'tap'
  | 'borewell'
  | 'well'
  | 'river'
  | 'lake'
  | 'pond'
  | 'canal'
  | 'rainwater'
  | 'treated'
  | 'other'

/**
 * A single water sample recorded by a user.
 *
 * These are manual laboratory/field entries. They are never described
 * anywhere in the UI as live sensor telemetry.
 */
export interface WaterMeasurement {
  id: string
  /** Free-text sample location label, e.g. "Yamuna ghat, Delhi". */
  sampleLocation: string
  latitude?: number
  longitude?: number
  sourceType: WaterSourceType
  /** ISO timestamp of when the sample was collected. */
  sampledAt: string
  /** pH, unitless (0-14). */
  ph: number
  /** Turbidity in NTU. */
  turbidity: number
  /** Dissolved oxygen in mg/L. */
  dissolvedOxygen: number
  /** Total dissolved solids in mg/L. */
  tds: number
  /** Water temperature in °C. */
  temperature: number
  /** Electrical conductivity in µS/cm. */
  conductivity: number
  /** Free-text observations, e.g. "slight odour, visible algae". */
  notes?: string
  /** ISO timestamp of record creation. */
  createdAt: string
  /** ISO timestamp of last edit. */
  updatedAt: string
  /** Marks records seeded by "Load sample data" so they can be identified. */
  isDemo?: boolean
}

export type WaterMeasurementInput = Omit<
  WaterMeasurement,
  'id' | 'createdAt' | 'updatedAt'
>

export type WaterRating = 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor'

export interface WaterParameterAssessment {
  key: WaterParameterKey
  label: string
  value: number
  unit: string
  /** 0-100 sub-score; higher is better. */
  subScore: number
  rating: WaterRating
  /** The acceptable range used to score this parameter. */
  acceptable: string
  message: string
}

export interface WaterQualityAssessment {
  /** 0-100 composite score; higher is better. */
  score: number
  rating: WaterRating
  label: string
  colorClass: string
  hex: string
  parameters: WaterParameterAssessment[]
  /** Parameters that fell outside their acceptable range. */
  concerns: WaterParameterAssessment[]
}

/** Whether water records are currently being mirrored to the backend. */
export type SyncStatus = 'connecting' | 'synced' | 'local-only'

/* -------------------------------------------------------------------------- */
/*  Settings                                                                  */
/* -------------------------------------------------------------------------- */

export type ThemeMode = 'light' | 'dark' | 'system'
export type TemperatureUnit = 'celsius' | 'fahrenheit'

export interface AppSettings {
  theme: ThemeMode
  temperatureUnit: TemperatureUnit
  /** Auto-refresh interval in minutes; 0 disables auto-refresh. */
  refreshIntervalMinutes: number
  /** Hours of air-quality history to request and chart. */
  historyWindowHours: number
  /** Show an alert when the AQI goes above this value; 0 turns alerts off. */
  aqiAlertThreshold: number
}

/* -------------------------------------------------------------------------- */
/*  Async request state                                                       */
/* -------------------------------------------------------------------------- */

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  status: AsyncStatus
  data: T | null
  error: string | null
  /** Set while a background refresh runs over already-displayed data. */
  isRefreshing: boolean
}
