/**
 * Typed localStorage persistence layer.
 *
 * Every read is defensive: storage can be unavailable (Safari private mode,
 * disabled cookies), the stored JSON can be corrupt, and a value written by
 * an older build can have the wrong shape. A validator runs on every read and
 * the fallback is returned whenever anything looks wrong, so a bad value can
 * never crash the application on startup.
 */

export const STORAGE_KEYS = {
  settings: 'ems.settings.v1',
  savedLocations: 'ems.locations.v1',
  activeLocation: 'ems.activeLocation.v1',
  waterMeasurements: 'ems.waterMeasurements.v1',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

/** Probe for a usable localStorage without throwing. */
export function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    const probe = '__ems_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/**
 * Read and validate a persisted value.
 *
 * @param validate Type guard. If it rejects the parsed value, `fallback` wins.
 */
export function readStorage<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return validate(parsed) ? parsed : fallback
  } catch (error) {
    console.warn(`[storage] Could not read "${key}":`, error)
    return fallback
  }
}

/** Persist a value. Returns false when storage is unavailable or full. */
export function writeStorage<T>(key: string, value: T): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`[storage] Could not write "${key}":`, error)
    return false
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage?.removeItem(key)
  } catch (error) {
    console.warn(`[storage] Could not remove "${key}":`, error)
  }
}

/** Clear only this application's keys, never the whole origin. */
export function clearAppStorage(): void {
  Object.values(STORAGE_KEYS).forEach(removeStorage)
}

/* -------------------------------------------------------------------------- */
/*  Validators                                                                */
/* -------------------------------------------------------------------------- */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isArrayOf<T>(
  guard: (item: unknown) => item is T,
): (value: unknown) => value is T[] {
  return (value: unknown): value is T[] =>
    Array.isArray(value) && value.every(guard)
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
