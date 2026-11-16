/**
 * Client for the EcoTrack backend (Express + SQLite, see /backend).
 *
 * The backend is optional. The web app keeps working from localStorage when
 * the server is not running; these calls only mirror records to it when it
 * is reachable.
 */

import type { WaterMeasurement } from '@/types'
import { isWaterMeasurement } from '@/lib/guards'

const BACKEND_BASE = (import.meta.env.VITE_BACKEND_URL ?? '/api').replace(/\/$/, '')
const SAMPLES_URL = `${BACKEND_BASE}/water-samples`
const TIMEOUT_MS = 4_000

/** Sync is switched off under the test runner, which stubs `fetch` globally. */
export const isBackendSyncEnabled = import.meta.env.MODE !== 'test'

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  })
  // Vite's dev server answers unknown paths with index.html, so a missing
  // backend can look like a 200; insist on JSON.
  const isJson = response.headers.get('content-type')?.includes('application/json')
  if (!response.ok || !isJson) {
    throw new Error(`Backend request failed (${response.status})`)
  }
  return (await response.json()) as T
}

export async function fetchWaterSamples(): Promise<WaterMeasurement[]> {
  const body = await request<{ data: unknown[] }>(SAMPLES_URL)
  return Array.isArray(body.data) ? body.data.filter(isWaterMeasurement) : []
}

export async function saveWaterSample(record: WaterMeasurement): Promise<void> {
  await request(`${SAMPLES_URL}/${encodeURIComponent(record.id)}`, {
    method: 'PUT',
    body: JSON.stringify(record),
  })
}

export async function deleteWaterSample(id: string): Promise<void> {
  await request(`${SAMPLES_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function deleteWaterSamples({ demoOnly }: { demoOnly: boolean }): Promise<void> {
  await request(demoOnly ? `${SAMPLES_URL}?demo=true` : SAMPLES_URL, { method: 'DELETE' })
}

/**
 * Combine local and server copies of the record list. Each record keeps the
 * copy with the later `updatedAt`, so an edit made offline is not lost.
 */
export function mergeWaterSamples(
  local: WaterMeasurement[],
  remote: WaterMeasurement[],
): WaterMeasurement[] {
  const merged = new Map<string, WaterMeasurement>()
  for (const record of [...remote, ...local]) {
    const existing = merged.get(record.id)
    if (!existing || Date.parse(record.updatedAt) > Date.parse(existing.updatedAt)) {
      merged.set(record.id, record)
    }
  }
  return Array.from(merged.values())
}

/** Summary returned by GET /api/water-samples/stats. */
export interface WaterSampleStats {
  total: number
  demo: number
  latestSampledAt: string | null
  averages: Record<string, number | null>
  bySourceType: Record<string, number>
}

export async function fetchWaterSampleStats(): Promise<WaterSampleStats> {
  const body = await request<{ data: WaterSampleStats }>(`${SAMPLES_URL}/stats`)
  return body.data
}
