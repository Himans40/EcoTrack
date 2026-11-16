/**
 * Environmental Map page.
 */

import { lazy, Suspense } from 'react'
import { Droplets, Info, MapPin, Wind } from 'lucide-react'
import { useEnvironment } from '@/context/EnvironmentDataContext'
import { useCityComparison } from '@/hooks/useCityComparison'
import { useLocations } from '@/context/LocationContext'
import { useWaterMeasurements } from '@/context/WaterContext'
import { PageHeader } from '@/components/StatCard'
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DemoDataBanner,
  Spinner,
} from '@/components/ui'
import { AQI_CATEGORIES, getAqiCategory } from '@/lib/aqi'
import { WATER_RATINGS } from '@/lib/wqi'
import { formatCoordinates, formatLocationName } from '@/lib/format'

/**
 * Leaflet is loaded lazily. It is the heaviest dependency in the project and
 * only one of the seven pages needs it, so code-splitting here keeps the
 * initial bundle small.
 */
const EnvironmentMap = lazy(() =>
  import('@/components/map/EnvironmentMap').then((module) => ({
    default: module.EnvironmentMap,
  })),
)

export default function EnvironmentMapPage() {
  const { activeLocation, savedLocations, selectLocation } = useLocations()
  const { measurements } = useWaterMeasurements()
  const { airQuality, isDemoMode } = useEnvironment()
  const { rows } = useCityComparison(savedLocations)
  // Map each saved city's id to its current AQI, for colouring its pin.
  const otherCityAqi = Object.fromEntries(
    rows.map((row) => [row.location.id, row.data?.current.usAqi ?? null]),
  )

  const mappableWater = measurements.filter(
    (m) => typeof m.latitude === 'number' && typeof m.longitude === 'number',
  )
  const unmappableCount = measurements.length - mappableWater.length
  const activeCategory = getAqiCategory(airQuality?.current.usAqi ?? null)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Environmental Map"
        description="Monitoring locations and water sampling points on an OpenStreetMap base layer."
      />

      {isDemoMode ? <DemoDataBanner /> : null}

      <div className="flex items-start gap-3 border-l-2 border-slate-300 py-1 pl-4 text-[13px] dark:border-slate-700">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
          aria-hidden
        />
        <p className="max-w-4xl leading-relaxed text-slate-600 dark:text-slate-300">
          Only points this application can actually verify are drawn: geocoded city
          coordinates, and water samples where you supplied coordinates yourself.
          No fictional monitoring stations are placed on the map. Every saved city is
          coloured by its own live AQI; if a city's data cannot be loaded it shows a
          neutral pin rather than a guessed value.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Map"
          icon={<MapPin className="h-4 w-4" aria-hidden />}
          subtitle={`Centred on ${formatLocationName(activeLocation)} · ${formatCoordinates(activeLocation.latitude, activeLocation.longitude)}`}
        />
        <CardBody>
          <Suspense fallback={<Spinner label="Loading map" />}>
            <EnvironmentMap
              activeLocation={activeLocation}
              savedLocations={savedLocations}
              airQuality={airQuality}
              waterMeasurements={measurements}
              onSelectLocation={selectLocation}
              otherCityAqi={otherCityAqi}
            />
          </Suspense>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Base map tiles &copy;{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-dotted"
            >
              OpenStreetMap
            </a>{' '}
            contributors. If tiles do not load, the map will show a plain background —
            the markers and their data remain correct.
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Legend"
            subtitle="Round pins are air quality monitoring locations; diamond pins are water samples."
          />
          <CardBody className="space-y-4">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Wind className="h-3.5 w-3.5" aria-hidden />
                Air quality pin colour (US AQI)
              </p>
              <ul className="space-y-1.5">
                {AQI_CATEGORIES.map((category) => (
                  <li key={category.key} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border-2 border-white shadow"
                      style={{ backgroundColor: category.hex }}
                      aria-hidden
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      {category.label}
                    </span>
                    <span className="ml-auto font-mono text-slate-400">
                      {category.range[0]}–{category.range[1]}
                    </span>
                  </li>
                ))}
                <li className="flex items-center gap-2 text-xs">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border-2 border-white bg-slate-500 shadow"
                    aria-hidden
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    Saved location, AQI not fetched
                  </span>
                </li>
              </ul>
            </div>

            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Droplets className="h-3.5 w-3.5" aria-hidden />
                Water sample pin colour (composite score)
              </p>
              <ul className="space-y-1.5">
                {WATER_RATINGS.map((rating) => (
                  <li key={rating.rating} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-4 w-4 shrink-0 rounded border-2 border-white shadow"
                      style={{ backgroundColor: rating.hex }}
                      aria-hidden
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      {rating.label}
                    </span>
                    <span className="ml-auto font-mono text-slate-400">
                      {rating.min}+
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Mapped points" />
          <CardBody>
            <dl className="space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-600 dark:text-slate-400">
                  Active monitoring location
                </dt>
                <dd className="text-right font-medium text-slate-900 dark:text-slate-100">
                  {formatLocationName(activeLocation)}
                  {activeCategory ? (
                    <Badge className={`ml-2 ${activeCategory.colorClass}`}>
                      {Math.round(airQuality?.current.usAqi ?? 0)}
                    </Badge>
                  ) : null}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-600 dark:text-slate-400">
                  Other saved locations
                </dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">
                  {Math.max(0, savedLocations.length - 1)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-600 dark:text-slate-400">
                  Water samples with coordinates
                </dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">
                  {mappableWater.length}
                </dd>
              </div>
            </dl>
            {unmappableCount > 0 ? (
              <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                {unmappableCount} water record
                {unmappableCount === 1 ? '' : 's'} cannot be mapped because no
                coordinates were entered. Edit a record and add latitude and longitude
                to place it here.
              </p>
            ) : null}
            {measurements.length === 0 ? (
              <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                No water samples have been recorded yet, so only monitoring locations
                appear on the map.
              </p>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
