/**
 * City search backed by the Open-Meteo geocoding API.
 *
 * Debounced, abortable, keyboard accessible, and explicit about the three
 * outcomes that are not success: too short, no matches, and request failed.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import type { GeoLocation } from '@/types'
import { searchLocations } from '@/services/geocoding'
import { ApiError, isAbortError } from '@/services/http'
import { formatCoordinates, formatLocationName } from '@/lib/format'
import { Button, Spinner } from './ui'

const DEBOUNCE_MS = 350

export function LocationSearch({
  onSelect,
  autoFocus = false,
  placeholder = 'Search for a city…',
}: {
  onSelect: (location: GeoLocation) => void
  autoFocus?: boolean
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoLocation[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const runSearch = useCallback(async (term: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsSearching(true)
    setError(null)
    try {
      const found = await searchLocations(term, { signal: controller.signal })
      if (controller.signal.aborted) return
      setResults(found)
    } catch (caught) {
      if (isAbortError(caught) || controller.signal.aborted) return
      setResults(null)
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Search failed. Please try again.',
      )
    } finally {
      if (!controller.signal.aborted) setIsSearching(false)
    }
  }, [])

  // Debounce so typing a city name does not fire a request per keystroke.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      abortRef.current?.abort()
      setResults(null)
      setError(null)
      setIsSearching(false)
      return
    }
    const timerId = window.setTimeout(() => void runSearch(trimmed), DEBOUNCE_MS)
    return () => window.clearTimeout(timerId)
  }, [query, runSearch])

  useEffect(() => () => abortRef.current?.abort(), [])

  const showTooShortHint = query.trim().length === 1

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          /* eslint-disable-next-line jsx-a11y/no-autofocus */
          autoFocus={autoFocus}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label="Search for a city"
          className="field-input pl-9 pr-9"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {showTooShortHint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Type at least two characters to search.
        </p>
      ) : null}

      {isSearching ? <Spinner label="Searching cities" /> : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
          <Button
            size="sm"
            variant="ghost"
            className="ml-2"
            onClick={() => void runSearch(query.trim())}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {!isSearching && !error && results !== null ? (
        results.length === 0 ? (
          <p className="rounded-lg bg-slate-100 px-3 py-2.5 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            No cities matched “{query.trim()}”. Check the spelling, or try a larger
            nearby city.
          </p>
        ) : (
          <ul className="max-h-72 divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {results.map((location) => (
              <li key={location.id}>
                <button
                  type="button"
                  onClick={() => onSelect(location)}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatLocationName(location)}
                    </span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {formatCoordinates(location.latitude, location.longitude)}
                      {location.population
                        ? ` · population ${location.population.toLocaleString()}`
                        : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  )
}
