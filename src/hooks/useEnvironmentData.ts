/**
 * Fetches air quality and weather for the active location.
 *
 * Responsibilities:
 *   - load both datasets together, so the dashboard never shows half a state
 *   - keep the previous data visible during a background refresh
 *   - abort in-flight requests when the location changes or on unmount
 *   - run the optional auto-refresh timer from Settings
 *   - offer an explicit, user-triggered switch to demonstration data when the
 *     provider is unreachable (never a silent fallback)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AirQualityDataset, GeoLocation, WeatherDataset } from '@/types'
import { fetchAirQuality } from '@/services/airQuality'
import { fetchWeather } from '@/services/weather'
import { buildDemoAirQuality, buildDemoWeather } from '@/services/demoData'
import { ApiError, isAbortError } from '@/services/http'
import { useSettings } from '@/context/SettingsContext'

export interface EnvironmentData {
  airQuality: AirQualityDataset | null
  weather: WeatherDataset | null
}

export interface UseEnvironmentDataResult extends EnvironmentData {
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  /** ISO timestamp of the last successful load. */
  lastUpdatedAt: string | null
  /** True while displaying the locally generated demonstration dataset. */
  isDemoMode: boolean
  refresh: () => void
  /** Explicitly swap in demonstration data after a failure. */
  useDemoData: () => void
}

export function useEnvironmentData(
  location: GeoLocation,
): UseEnvironmentDataResult {
  const { settings } = useSettings()
  const { historyWindowHours, refreshIntervalMinutes } = settings

  const [data, setData] = useState<EnvironmentData>({
    airQuality: null,
    weather: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  // Guards against a slow earlier request resolving after a newer one.
  const requestIdRef = useRef(0)

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      if (mode === 'initial') {
        setIsLoading(true)
        setData({ airQuality: null, weather: null })
      } else {
        setIsRefreshing(true)
      }
      setError(null)

      try {
        const [airQuality, weather] = await Promise.all([
          fetchAirQuality(location, {
            historyHours: historyWindowHours,
            signal: controller.signal,
          }),
          fetchWeather(location, {
            historyHours: historyWindowHours,
            signal: controller.signal,
          }),
        ])

        if (requestId !== requestIdRef.current) return

        setData({ airQuality, weather })
        setLastUpdatedAt(new Date().toISOString())
        setIsDemoMode(false)
      } catch (caught) {
        if (isAbortError(caught) || controller.signal.aborted) return
        if (requestId !== requestIdRef.current) return

        const message =
          caught instanceof ApiError
            ? caught.message
            : 'Could not load environmental data for this location.'
        setError(message)
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    },
    [location, historyWindowHours],
  )

  // Initial load, and a reload whenever the location or window changes.
  useEffect(() => {
    void load('initial')
    return () => abortRef.current?.abort()
  }, [load])

  // Optional auto-refresh. Skipped entirely while showing demonstration data,
  // because there is nothing to refresh from.
  useEffect(() => {
    if (refreshIntervalMinutes <= 0 || isDemoMode) return
    const intervalId = window.setInterval(
      () => void load('refresh'),
      refreshIntervalMinutes * 60_000,
    )
    return () => window.clearInterval(intervalId)
  }, [refreshIntervalMinutes, isDemoMode, load])

  const refresh = useCallback(() => {
    void load(data.airQuality ? 'refresh' : 'initial')
  }, [load, data.airQuality])

  const useDemoData = useCallback(() => {
    abortRef.current?.abort()
    // Bump the request id so any in-flight response is discarded.
    requestIdRef.current += 1
    setData({
      airQuality: buildDemoAirQuality(location, historyWindowHours),
      weather: buildDemoWeather(location, historyWindowHours),
    })
    setIsDemoMode(true)
    setError(null)
    setIsLoading(false)
    setIsRefreshing(false)
    setLastUpdatedAt(new Date().toISOString())
  }, [location, historyWindowHours])

  return {
    ...data,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    isDemoMode,
    refresh,
    useDemoData,
  }
}
