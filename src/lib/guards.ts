/**
 * Runtime type guards for every persisted shape.
 *
 * These guard the boundary between localStorage (untyped, possibly written by
 * an older version of the app) and the typed application core.
 */

import type {
  AppSettings,
  GeoLocation,
  TemperatureUnit,
  ThemeMode,
  WaterMeasurement,
  WaterSourceType,
} from '@/types'
import { isFiniteNumber, isNonEmptyString, isRecord } from './storage'

const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system']
const TEMPERATURE_UNITS: TemperatureUnit[] = ['celsius', 'fahrenheit']
const WATER_SOURCE_TYPES: WaterSourceType[] = [
  'tap',
  'borewell',
  'well',
  'river',
  'lake',
  'pond',
  'canal',
  'rainwater',
  'treated',
  'other',
]

export function isGeoLocation(value: unknown): value is GeoLocation {
  if (!isRecord(value)) return false
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180
  )
}

export function isAppSettings(value: unknown): value is AppSettings {
  if (!isRecord(value)) return false
  return (
    THEME_MODES.includes(value.theme as ThemeMode) &&
    TEMPERATURE_UNITS.includes(value.temperatureUnit as TemperatureUnit) &&
    isFiniteNumber(value.refreshIntervalMinutes) &&
    value.refreshIntervalMinutes >= 0 &&
    isFiniteNumber(value.historyWindowHours) &&
    value.historyWindowHours > 0
  )
}

export function isWaterMeasurement(value: unknown): value is WaterMeasurement {
  if (!isRecord(value)) return false
  const numericFields = [
    'ph',
    'turbidity',
    'dissolvedOxygen',
    'tds',
    'temperature',
    'conductivity',
  ] as const

  if (!numericFields.every((field) => isFiniteNumber(value[field]))) return false

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.sampleLocation) &&
    isNonEmptyString(value.sampledAt) &&
    isNonEmptyString(value.createdAt) &&
    isNonEmptyString(value.updatedAt) &&
    WATER_SOURCE_TYPES.includes(value.sourceType as WaterSourceType)
  )
}
