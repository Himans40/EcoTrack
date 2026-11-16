/**
 * Leaflet map of monitoring locations and water sampling points.
 *
 * Only real, verifiable points are drawn:
 *   - the active and saved monitoring locations (geocoded coordinates), each
 *     labelled with the AQI actually fetched for it;
 *   - water sampling points, but only for records where the user supplied
 *     coordinates themselves.
 *
 * No synthetic "monitoring stations" are invented. Markers use Leaflet
 * `divIcon`s rather than the default image icons, which both avoids the
 * well-known bundler asset problem and lets a marker carry its AQI colour.
 */

import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { AirQualityDataset, GeoLocation, WaterMeasurement } from '@/types'
import { getAqiCategory } from '@/lib/aqi'
import { assessWaterMeasurement, WATER_SOURCE_LABELS } from '@/lib/wqi'
import { formatDateTime, formatLocationName } from '@/lib/format'

const TILE_URL =
  import.meta.env.VITE_OSM_TILE_URL ??
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** Circular pin whose fill carries meaning (AQI colour or water rating). */
function buildPinIcon(color: string, label: string, isActive: boolean): L.DivIcon {
  const size = isActive ? 42 : 34
  return L.divIcon({
    className: 'ems-pin',
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:9999px;
        background:${color};
        border:${isActive ? 3 : 2}px solid #ffffff;
        box-shadow:0 2px 8px rgb(0 0 0 / 0.35);
        display:flex;align-items:center;justify-content:center;
        color:#ffffff;font-weight:700;
        font-size:${isActive ? 13 : 11}px;
        font-family:'Schibsted Grotesk',system-ui,sans-serif;
      ">${label}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

/** Square pin, to distinguish water samples from air monitoring points. */
function buildWaterIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'ems-pin',
    html: `
      <div style="
        width:26px;height:26px;border-radius:6px;
        background:${color};
        border:2px solid #ffffff;
        box-shadow:0 2px 8px rgb(0 0 0 / 0.35);
        display:flex;align-items:center;justify-content:center;
        color:#ffffff;font-size:13px;line-height:1;
      ">&#9826;</div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  })
}

/** Recentre the map when the active location changes. */
function RecenterOnChange({
  latitude,
  longitude,
}: {
  latitude: number
  longitude: number
}) {
  const map = useMap()
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom(), { animate: true })
  }, [map, latitude, longitude])
  return null
}

export function EnvironmentMap({
  activeLocation,
  savedLocations,
  airQuality,
  waterMeasurements,
  onSelectLocation,
  otherCityAqi = {},
  height = 520,
}: {
  activeLocation: GeoLocation
  savedLocations: GeoLocation[]
  airQuality: AirQualityDataset | null
  waterMeasurements: WaterMeasurement[]
  onSelectLocation: (location: GeoLocation) => void
  /** Current AQI for the other saved cities, keyed by location id. */
  otherCityAqi?: Record<string, number | null>
  height?: number
}) {
  const activeAqi = airQuality?.current.usAqi ?? null
  const activeCategory = getAqiCategory(activeAqi)

  // Only records where the user actually supplied coordinates can be mapped.
  const mappableWater = useMemo(
    () =>
      waterMeasurements.filter(
        (measurement) =>
          typeof measurement.latitude === 'number' &&
          typeof measurement.longitude === 'number',
      ),
    [waterMeasurements],
  )

  return (
    <div
      className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
      style={{ height }}
    >
      <MapContainer
        center={[activeLocation.latitude, activeLocation.longitude]}
        zoom={10}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
        <RecenterOnChange
          latitude={activeLocation.latitude}
          longitude={activeLocation.longitude}
        />

        {/* Active monitoring location, coloured by its real AQI */}
        <Marker
          position={[activeLocation.latitude, activeLocation.longitude]}
          icon={buildPinIcon(
            activeCategory?.hex ?? '#8f9c95',
            activeAqi !== null ? String(Math.round(activeAqi)) : '?',
            true,
          )}
        >
          <Popup>
            <strong>{formatLocationName(activeLocation)}</strong>
            <br />
            {activeAqi !== null ? (
              <>
                US AQI {Math.round(activeAqi)} — {activeCategory?.label}
                <br />
                <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>
                  {airQuality?.provenance.origin === 'demo'
                    ? 'Demonstration data, not a real observation'
                    : `Observed ${formatDateTime(airQuality?.current.observedAt ?? null)} local time`}
                </span>
              </>
            ) : (
              <span style={{ fontSize: '0.75rem' }}>No AQI value available</span>
            )}
            <br />
            <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>
              Active monitoring location
            </span>
          </Popup>
        </Marker>

        {/* Other saved locations — coloured by their own AQI when it loaded,
            otherwise a neutral pin rather than a guessed value. */}
        {savedLocations
          .filter((location) => location.id !== activeLocation.id)
          .map((location) => {
            const aqi = otherCityAqi[location.id] ?? null
            const category = getAqiCategory(aqi)
            return (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={buildPinIcon(
                category?.hex ?? '#8f9c95',
                aqi !== null ? String(Math.round(aqi)) : '•',
                false,
              )}
            >
              <Popup>
                <strong>{formatLocationName(location)}</strong>
                <br />
                <span style={{ fontSize: '0.75rem' }}>
                  {aqi !== null
                    ? `US AQI ${Math.round(aqi)} — ${category?.label}`
                    : 'Air quality could not be loaded for this city.'}
                </span>
                <br />
                <button
                  type="button"
                  onClick={() => onSelectLocation(location)}
                  style={{
                    marginTop: '0.4rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    background: '#1f5e4e',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Monitor this location
                </button>
              </Popup>
            </Marker>
            )
          })}

        {/* Water sampling points */}
        {mappableWater.map((measurement) => {
          const assessment = assessWaterMeasurement(measurement)
          return (
            <Marker
              key={measurement.id}
              position={[measurement.latitude as number, measurement.longitude as number]}
              icon={buildWaterIcon(assessment.hex)}
            >
              <Popup>
                <strong>{measurement.sampleLocation}</strong>
                <br />
                {WATER_SOURCE_LABELS[measurement.sourceType]}
                <br />
                Composite score {assessment.score}/100 — {assessment.label}
                <br />
                <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>
                  Sampled {formatDateTime(measurement.sampledAt)}
                  <br />
                  {measurement.isDemo
                    ? 'Demonstration sample'
                    : 'Manually recorded by you — not sensor data'}
                </span>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
