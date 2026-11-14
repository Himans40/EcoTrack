/**
 * Saved and active monitoring locations, persisted to localStorage.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { GeoLocation } from '@/types'
import { isGeoLocation } from '@/lib/guards'
import { isArrayOf, readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'
import { DEFAULT_LOCATIONS, FALLBACK_LOCATION } from '@/services/geocoding'

interface LocationContextValue {
  activeLocation: GeoLocation
  savedLocations: GeoLocation[]
  /** Switch the active location, saving it if it is not already saved. */
  selectLocation: (location: GeoLocation) => void
  saveLocation: (location: GeoLocation) => void
  removeLocation: (id: string) => void
  isSaved: (id: string) => boolean
  resetLocations: () => void
}

const LocationContext = createContext<LocationContextValue | null>(null)

const isGeoLocationArray = isArrayOf(isGeoLocation)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [savedLocations, setSavedLocations] = useState<GeoLocation[]>(() =>
    readStorage(
      STORAGE_KEYS.savedLocations,
      // Seed with a few real cities so the app is usable on first launch.
      DEFAULT_LOCATIONS.slice(0, 3),
      isGeoLocationArray,
    ),
  )

  const [activeLocation, setActiveLocation] = useState<GeoLocation>(() =>
    readStorage(STORAGE_KEYS.activeLocation, FALLBACK_LOCATION, isGeoLocation),
  )

  useEffect(() => {
    writeStorage(STORAGE_KEYS.savedLocations, savedLocations)
  }, [savedLocations])

  useEffect(() => {
    writeStorage(STORAGE_KEYS.activeLocation, activeLocation)
  }, [activeLocation])

  const saveLocation = useCallback((location: GeoLocation) => {
    setSavedLocations((previous) =>
      previous.some((item) => item.id === location.id)
        ? previous
        : [...previous, location],
    )
  }, [])

  const selectLocation = useCallback((location: GeoLocation) => {
    setActiveLocation(location)
    // Selecting a searched-for city implicitly saves it, which is what users
    // expect — otherwise it disappears from the switcher on the next visit.
    setSavedLocations((previous) =>
      previous.some((item) => item.id === location.id)
        ? previous
        : [...previous, location],
    )
  }, [])

  const removeLocation = useCallback((id: string) => {
    setSavedLocations((previous) => {
      const next = previous.filter((item) => item.id !== id)
      // Never leave the switcher empty.
      return next.length > 0 ? next : [FALLBACK_LOCATION]
    })
    // If the active location was removed, fall back to the first remaining one.
    setActiveLocation((current) => {
      if (current.id !== id) return current
      const remaining = savedLocations.filter((item) => item.id !== id)
      return remaining[0] ?? FALLBACK_LOCATION
    })
  }, [savedLocations])

  const isSaved = useCallback(
    (id: string) => savedLocations.some((item) => item.id === id),
    [savedLocations],
  )

  const resetLocations = useCallback(() => {
    setSavedLocations(DEFAULT_LOCATIONS.slice(0, 3))
    setActiveLocation(FALLBACK_LOCATION)
  }, [])

  const value = useMemo<LocationContextValue>(
    () => ({
      activeLocation,
      savedLocations,
      selectLocation,
      saveLocation,
      removeLocation,
      isSaved,
      resetLocations,
    }),
    [
      activeLocation,
      savedLocations,
      selectLocation,
      saveLocation,
      removeLocation,
      isSaved,
      resetLocations,
    ],
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocations(): LocationContextValue {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocations must be used inside a <LocationProvider>')
  }
  return context
}
