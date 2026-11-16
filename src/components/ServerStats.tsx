/**
 * Small panel on the Settings page showing what the EcoTrack backend holds.
 * Only rendered while the app is connected to the backend.
 */

import { useEffect, useState } from 'react'
import { Server } from 'lucide-react'
import type { WaterSourceType } from '@/types'
import { fetchWaterSampleStats, type WaterSampleStats } from '@/services/backend'
import { WATER_SOURCE_LABELS } from '@/lib/wqi'
import { formatDateTime } from '@/lib/format'

/** The source type with the most samples, or null when there are none. */
export function mostCommonSource(bySourceType: Record<string, number>): string | null {
  let best: string | null = null
  for (const [source, count] of Object.entries(bySourceType)) {
    if (best === null || count > bySourceType[best]) best = source
  }
  return best
}

export function ServerStats({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<WaterSampleStats | null>(null)
  const [failed, setFailed] = useState(false)

  // Reload whenever the number of local records changes.
  useEffect(() => {
    fetchWaterSampleStats()
      .then((result) => {
        setStats(result)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [refreshKey])

  if (failed) return null

  const topSource = stats ? mostCommonSource(stats.bySourceType) : null

  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/40">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
        <Server className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
        On the server
      </p>
      {stats ? (
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-3">
          <div className="flex gap-1.5">
            <dt className="text-slate-500 dark:text-slate-400">Samples stored</dt>
            <dd className="font-medium text-slate-900 dark:text-white">{stats.total}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-slate-500 dark:text-slate-400">Latest sample</dt>
            <dd className="font-medium text-slate-900 dark:text-white">
              {stats.latestSampledAt ? formatDateTime(stats.latestSampledAt) : '—'}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-slate-500 dark:text-slate-400">Most common source</dt>
            <dd className="font-medium text-slate-900 dark:text-white">
              {topSource ? WATER_SOURCE_LABELS[topSource as WaterSourceType] ?? topSource : '—'}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-2 text-[13px] text-slate-500">Loading server statistics…</p>
      )}
    </div>
  )
}
