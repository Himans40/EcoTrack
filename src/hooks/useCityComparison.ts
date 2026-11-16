/**
 * Loads current air quality for several cities at once, for the Compare page.
 *
 * Each city is fetched in parallel. One city failing does not hide the
 * others: every row carries its own result or error message.
 */

import { useCallback, useEffect, useState } from 'react'
import type { AirQualityDataset, GeoLocation } from '@/types'
import { fetchAirQuality } from '@/services/airQuality'
import { ApiError, isAbortError } from '@/services/http'

export interface CityComparisonRow {
  location: GeoLocation
  data: AirQualityDataset | null
  error: string | null
}

/** Sort rows best air first; cities without a reading go to the end. */
export function sortByAqi(rows: CityComparisonRow[]): CityComparisonRow[] {
  const aqiOf = (row: CityComparisonRow) => row.data?.current.usAqi ?? Infinity
  return [...rows].sort((a, b) => aqiOf(a) - aqiOf(b))
}

export function useCityComparison(locations: GeoLocation[]) {
  const [rows, setRows] = useState<CityComparisonRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reloadCount, setReloadCount] = useState(0)

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)

    const requests = locations.map((location) =>
      fetchAirQuality(location, { historyHours: 24, signal: controller.signal }),
    )

    // allSettled waits for every city, whether its request worked or not.
    Promise.allSettled(requests).then((results) => {
      if (controller.signal.aborted) return
      const nextRows = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return { location: locations[index], data: result.value, error: null }
        }
        const reason = result.reason
        if (isAbortError(reason)) return { location: locations[index], data: null, error: null }
        return {
          location: locations[index],
          data: null,
          error: reason instanceof ApiError ? reason.message : 'Could not load this city.',
        }
      })
      setRows(sortByAqi(nextRows))
      setIsLoading(false)
    })

    return () => controller.abort()
  }, [locations, reloadCount])

  return { rows, isLoading, reload }
}
