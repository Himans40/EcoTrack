/// <reference types="vite/client" />

/**
 * Typed environment variables.
 *
 * All of these are optional — the application falls back to the public
 * Open-Meteo and OpenStreetMap endpoints when they are not set, so the
 * project runs with no `.env` file at all. See `.env.example`.
 */
interface ImportMetaEnv {
  readonly VITE_AIR_QUALITY_API_BASE?: string
  readonly VITE_WEATHER_API_BASE?: string
  readonly VITE_GEOCODING_API_BASE?: string
  readonly VITE_OSM_TILE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
