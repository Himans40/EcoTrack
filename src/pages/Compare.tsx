/**
 * Compare cities — current air quality for every saved city, ranked from
 * cleanest to most polluted.
 */

import { RefreshCw, Scale } from 'lucide-react'
import { useLocations } from '@/context/LocationContext'
import { useCityComparison, type CityComparisonRow } from '@/hooks/useCityComparison'
import { HourStrip, lastDayOfReadings } from '@/components/air/AqiReading'
import { PageHeader } from '@/components/StatCard'
import { Button, Card, EmptyState, OriginBadge, SkeletonBlock } from '@/components/ui'
import { getAqiCategory, POLLUTANT_META } from '@/lib/aqi'
import { formatLocationName, formatNumber } from '@/lib/format'

/** AQI values above this fill the whole bar. */
const BAR_SCALE_TOP = 300

export default function ComparePage() {
  const { savedLocations, activeLocation, selectLocation } = useLocations()
  const { rows, isLoading, reload } = useCityComparison(savedLocations)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Compare Cities"
        description="Current air quality in each of your saved cities, ranked from cleanest to most polluted. Add more cities from the top bar."
        actions={
          <Button onClick={reload} isLoading={isLoading}>
            {!isLoading ? <RefreshCw className="h-4 w-4" aria-hidden /> : null}
            Refresh
          </Button>
        }
      />

      {savedLocations.length < 2 ? (
        <Card>
          <EmptyState
            icon={<Scale className="h-5 w-5" aria-hidden />}
            title="Save at least two cities to compare"
            description="Use “Add city” in the top bar to save another city. Every saved city appears here side by side."
          />
        </Card>
      ) : isLoading && rows.length === 0 ? (
        <div className="space-y-3">
          {savedLocations.map((location) => (
            <SkeletonBlock key={location.id} className="h-24" />
          ))}
        </div>
      ) : (
        <Card>
          <ol className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, index) => (
              <CityRow
                key={row.location.id}
                rank={index + 1}
                row={row}
                isActive={row.location.id === activeLocation.id}
                onMakeActive={() => selectLocation(row.location)}
              />
            ))}
          </ol>
        </Card>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        All values are US EPA AQI from the Open-Meteo Air Quality API. Bars use a fixed
        0–{BAR_SCALE_TOP} scale so cities can be compared directly.
      </p>
    </div>
  )
}

function CityRow({
  rank,
  row,
  isActive,
  onMakeActive,
}: {
  rank: number
  row: CityComparisonRow
  isActive: boolean
  onMakeActive: () => void
}) {
  const aqi = row.data?.current.usAqi ?? null
  const category = getAqiCategory(aqi)
  const dominant = row.data?.current.dominantPollutant
  const pm25 = row.data?.current.pollutants.find((reading) => reading.key === 'pm2_5')?.value

  return (
    <li className="grid gap-4 px-5 py-5 sm:grid-cols-[2rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_13rem] sm:items-center">
      <span className="hidden text-sm text-slate-400 sm:block">{rank}</span>

      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900 dark:text-white">
          {formatLocationName(row.location)}
        </p>
        <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
          {row.error
            ? row.error
            : dominant
              ? `Mostly ${POLLUTANT_META[dominant].shortLabel} · PM2.5 ${formatNumber(pm25 ?? null, 1)} µg/m³`
              : 'No pollutant breakdown'}
        </p>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold leading-none" style={{ color: category?.hex }}>
            {aqi === null ? '—' : Math.round(aqi)}
          </span>
          <span className="text-[13px] text-slate-600 dark:text-slate-300">
            {category?.label ?? 'No reading'}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, ((aqi ?? 0) / BAR_SCALE_TOP) * 100)}%`,
              backgroundColor: category?.hex,
            }}
          />
        </div>
      </div>

      <div aria-label="Last 24 hours">
        {row.data ? <HourStrip points={lastDayOfReadings(row.data.hourly)} compact /> : null}
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        {row.data ? <OriginBadge origin={row.data.provenance.origin} /> : null}
        {isActive ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">Active</span>
        ) : (
          <Button size="sm" variant="ghost" onClick={onMakeActive}>
            Make active
          </Button>
        )}
      </div>
    </li>
  )
}
