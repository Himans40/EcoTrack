/**
 * Shared HTTP helper for the Open-Meteo endpoints.
 *
 * Centralises timeout handling, abort support and error normalisation so that
 * every page can render a consistent, specific error state instead of a bare
 * "failed to fetch".
 */

/** An HTTP or network failure with a message safe to show to the user. */
export class ApiError extends Error {
  readonly status: number | null
  readonly isNetworkError: boolean
  readonly isTimeout: boolean

  constructor(
    message: string,
    options: { status?: number | null; isNetworkError?: boolean; isTimeout?: boolean } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status ?? null
    this.isNetworkError = options.isNetworkError ?? false
    this.isTimeout = options.isTimeout ?? false
  }
}

const DEFAULT_TIMEOUT_MS = 15_000

export interface FetchJsonOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

/**
 * GET a JSON document, with a hard timeout.
 *
 * The caller's `signal` and our internal timeout are combined, so a component
 * unmounting and a slow network both abort the same request cleanly.
 */
export async function fetchJson<T>(
  url: string,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: FetchJsonOptions = {},
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)

  const onCallerAbort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', onCallerAbort)

  let timedOut = false
  const timeoutWatcher = setTimeout(() => {
    timedOut = true
  }, timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      // Open-Meteo returns {"error":true,"reason":"..."} with a 4xx status.
      let reason = `${response.status} ${response.statusText}`.trim()
      try {
        const body = (await response.json()) as { reason?: string }
        if (body?.reason) reason = body.reason
      } catch {
        // Body was not JSON; the status text is the best we have.
      }
      throw new ApiError(reason, { status: response.status })
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) throw error

    // A caller-initiated abort is not an error the user should see; re-throw
    // the DOMException so callers can detect and ignore it.
    if (signal?.aborted) throw error

    if (timedOut || (error as Error)?.message === 'timeout') {
      throw new ApiError(
        'The request timed out. The data provider may be slow or unreachable.',
        { isTimeout: true },
      )
    }
    if (error instanceof TypeError) {
      throw new ApiError(
        'Could not reach the data provider. Check your internet connection.',
        { isNetworkError: true },
      )
    }
    throw new ApiError((error as Error)?.message || 'An unexpected error occurred.')
  } finally {
    clearTimeout(timeoutId)
    clearTimeout(timeoutWatcher)
    signal?.removeEventListener('abort', onCallerAbort)
  }
}

/** True when a thrown value is an abort rather than a real failure. */
export function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  )
}

/**
 * Convert an Open-Meteo local wall-clock timestamp into a true UTC instant.
 *
 * With `timezone=auto` the API returns naive local times like
 * "2026-11-11T03:30" plus a `utc_offset_seconds` field. Parsing the naive
 * string directly would interpret it in the *browser's* timezone, which is
 * wrong whenever the user is monitoring a city in another zone. We therefore
 * parse it as UTC and subtract the location's offset to recover the instant.
 */
export function localTimeToUtcIso(
  localTime: string,
  utcOffsetSeconds: number,
): string | null {
  if (!localTime) return null
  // Pad "2026-11-11T03:30" to a full ISO UTC string.
  const padded = localTime.length === 16 ? `${localTime}:00Z` : `${localTime}Z`
  const asIfUtc = Date.parse(padded)
  if (Number.isNaN(asIfUtc)) return null
  return new Date(asIfUtc - utcOffsetSeconds * 1000).toISOString()
}

/** Build a query string, dropping undefined values. */
export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    search.set(key, String(value))
  }
  return search.toString()
}
