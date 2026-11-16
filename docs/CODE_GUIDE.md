# Code Guide

A plain-language walk through every part of the EcoTrack code: what each file is
for and what each function does. Use it to find your way around the project and to
answer "what does this function do?" during a review.

---

## 1. How the pieces fit together

```
Browser (React app, src/)                       Backend (Express, backend/)
──────────────────────────                      ───────────────────────────
pages/  ── use ──▶ context/  ── call ──▶ services/ ──▶ Open-Meteo APIs (air, weather, geocoding)
   │                  │                      │
   │                  │                      └──────▶ /api/water-samples ──▶ SQLite database
   └── use ──▶ components/  ── use ──▶ lib/ (AQI maths, WQI maths, CSV, formatting)
```

- **pages/**: one file per screen (Overview, Air Quality, Water Quality and so on).
- **components/**: reusable pieces of screen (cards, charts, the map, the sidebar).
- **context/**: shared state every page can read (settings, cities, water records,
  live data, toasts).
- **hooks/**: reusable data-loading logic.
- **services/**: code that talks to the outside world (APIs, the backend).
- **lib/**: pure calculation and helper functions with no React in them. These are
  the easiest to test and the most likely to be asked about.
- **backend/**: a small Express server that stores water samples in SQLite.

**What happens when the app opens:**

1. `main.tsx` renders `<App />`.
2. `App.tsx` wraps everything in the providers (Settings, Toasts, Locations, Water,
   Environment data) and sets up the routes.
3. `EnvironmentDataContext` calls `useEnvironmentData`, which fetches air quality
   and weather for the active city.
4. `WaterContext` loads water records from `localStorage`, then tries the backend
   and merges the two lists.
5. The current page reads whatever it needs from those contexts and draws it.

---

## 2. `src/lib/`: calculations and helpers

### `lib/aqi.ts`: US EPA Air Quality Index

| Function | What it does |
| --- | --- |
| `getAqiCategory(aqi)` | Returns the EPA category (Good, Moderate, …) for an AQI number, or `null` if there is no number. |
| `getCategoryByKey(key)` | Looks up a category by its key, such as `'unhealthy'`. |
| `truncate(value, decimals)` | Cuts a number to a set number of decimals **without rounding**. EPA requires this before looking up a breakpoint. |
| `calculateSubIndexDetailed(key, µg/m³)` | The core AQI formula for one pollutant. It converts the concentration into the unit EPA uses (µg/m³, ppm or ppb), truncates it, finds the matching band in the breakpoint table, then applies **I = (I_hi − I_lo) / (BP_hi − BP_lo) × (C − BP_lo) + I_lo**. If the value is above the top of the table, it is capped and flagged. |
| `calculateSubIndex(key, µg/m³)` | The same, but returns only the number. |
| `calculateOverallAqi(concentrations)` | Works out every pollutant's sub-index and takes the **maximum**, not the average. The pollutant with the maximum is the *dominant pollutant*. |
| `aqiToScalePercent(aqi)` | Converts an AQI into a 0–100 % position on the 0–500 scale, for the gauge and the scale strip. |

Gas conversions use `ppb = µg/m³ × 24.45 ÷ molar mass` (the molar volume at 25 °C).

### `lib/wqi.ts`: Water quality score

| Function | What it does |
| --- | --- |
| `interpolateScore(value, anchors)` | Turns a measurement into a 0–100 sub-score by drawing straight lines between "anchor" points, such as pH 6.5 → 100 and pH 5.5 → 45. |
| `getWaterRating(score)` | Maps a 0–100 score to Excellent (85+), Good (70+), Fair (50+), Poor (30+) or Very poor. |
| `assessParameter(key, value)` | Scores one parameter and attaches its label, unit, acceptable range and a message. |
| `assessWaterMeasurement(sample)` | Scores all six parameters and combines them: **score = Σ sub-score × weight**. The weights are pH 0.18, turbidity 0.22, dissolved oxygen 0.22, TDS 0.18, conductivity 0.12 and temperature 0.08, and they add up to 1. Any parameter scoring below 70 is listed as a *concern*. |
| `averageWaterScore(samples)` | The average composite score across samples. |
| `totalParameterWeight()` | Adds up the weights so a test can check they sum to exactly 1. |
| `describeMeasurementOrigin(samples)` | Says whether records are the user's own, demonstration samples, or a mix, so the badge never overstates how real the data is. |

### `lib/csv.ts`: CSV export

| Function | What it does |
| --- | --- |
| `escapeCsvField(value)` | Puts quotes around a cell that contains a comma, quote or line break, and doubles any quotes inside it. If a cell starts with `=`, `+`, `-` or `@`, it adds `'` in front so Excel does not run it as a formula (CSV injection). |
| `toCsvRow(fields)` | Escapes each cell and joins them with commas. |
| `waterMeasurementsToCsv(samples)` | Builds the water records CSV, including the score, rating and origin columns. |
| `airHistoryToCsv(points)` | Builds the hourly AQI and pollutant CSV used by Analytics. |
| `downloadTextFile(name, text)` | Makes the browser download a text file. |
| `buildExportFilename(prefix)` | Builds a file name with today's date, such as `water-quality-measurements-2026-11-16.csv`. |

### `lib/format.ts`: Display formatting

`formatNumber` and `formatInteger` print numbers, or "—" when there is no value.
`celsiusToFahrenheit` and `formatTemperature` handle the temperature-unit setting.
`formatDateTime`, `formatDate` and `formatHour` format timestamps. `formatRelativeTime`
gives "5 minutes ago". `formatLocationName` builds "Delhi, India" without repeating
names, and `formatCoordinates` prints "28.6519° N, 77.2315° E".

### `lib/storage.ts` and `lib/guards.ts`: Saving safely in the browser

| Function | What it does |
| --- | --- |
| `isStorageAvailable()` | Checks that `localStorage` works (it can be blocked in private mode). |
| `readStorage(key, fallback, validate)` | Reads JSON, checks its shape with a *guard*, and returns the fallback if it is missing, corrupt or the wrong shape. |
| `writeStorage(key, value)` | Saves JSON. Returns `false` instead of crashing when storage is full. |
| `removeStorage`, `clearAppStorage` | Delete one key, or every EcoTrack key. |
| `isRecord`, `isArrayOf`, `isFiniteNumber`, `isNonEmptyString` | Small building blocks for guards. |
| `isGeoLocation`, `isAppSettings`, `isWaterMeasurement` | Guards that check a stored value really is a city, the settings or a water record before the app uses it. |

### `lib/id.ts`

`createId(prefix)` returns a unique id such as `water_3f2a…`, using
`crypto.randomUUID()` when it is available and a timestamp plus random text otherwise.

---

## 3. `src/services/`: talking to the outside world

### `services/http.ts`

| Function | What it does |
| --- | --- |
| `ApiError` | An error class whose message is safe to show to the user, recording whether it was a timeout or a network failure. |
| `fetchJson(url, options)` | Fetches JSON with a 15-second timeout and turns every kind of failure into a clear `ApiError`. |
| `isAbortError(error)` | True when a request was cancelled on purpose (for example, the user switched city), so the app does not show an error for it. |
| `localTimeToUtcIso(time, offset)` | Open-Meteo returns local times without a timezone; this converts them to real UTC instants. |
| `buildQuery(params)` | Builds `?a=1&b=2`, skipping empty values. |

### `services/airQuality.ts`

`fetchAirQuality(location, options)` requests current values, past hours and two
forecast days from Open-Meteo, then splits the result into:

- `current`: the latest snapshot, from `parseSnapshot`. It uses the provider's own
  AQI and works out each pollutant's sub-index and the dominant pollutant.
- `hourly`: past hours only, from `observedHours`.
- `forecast`: the next 24 hours, from `forecastHours`.

`parseHourlyPoints` turns the API's column arrays into one object per hour, and
`readNumber` keeps only real numbers.

### `services/weather.ts`

`fetchWeather(location, options)` does the same for temperature, humidity, wind
and precipitation.

### `services/geocoding.ts`

| Function | What it does |
| --- | --- |
| `searchLocations(query)` | City search. Returns nothing for fewer than two characters. |
| `getDevicePosition()` | Asks the browser for the device's position, with a clear message if permission is refused. |
| `locationFromCoordinates(lat, lon)` | Looks up the city name for a position (BigDataCloud). If that fails it still returns "My location". |

### `services/backend.ts`: the EcoTrack server

| Function | What it does |
| --- | --- |
| `fetchWaterSamples()` | GET all samples from the backend. |
| `saveWaterSample(record)` | PUT one sample (creates or updates it). |
| `deleteWaterSample(id)`, `deleteWaterSamples({ demoOnly })` | Delete one sample, all samples, or only demo samples. |
| `mergeWaterSamples(local, remote)` | Combines the browser's and the server's lists. When both have the same record, the one with the later `updatedAt` wins. |
| `fetchWaterSampleStats()` | GET the totals and averages for the Settings page. |

### `services/demoData.ts`

This file builds clearly labelled *demonstration* data, used only when the user asks
for it. `createRandom(seed)` is a seeded random generator, so the demo looks the same
every time. `diurnalFactor(hour)` shapes values with morning and evening rush-hour
peaks. `buildDemoAirQuality`, `buildDemoWeather` and `buildDemoWaterMeasurements`
build the datasets.

---

## 4. `src/context/` and `src/hooks/`: shared state

| File | What it holds |
| --- | --- |
| `SettingsContext` | Theme, temperature unit, refresh interval, history window and AQI alert level. Saved in `localStorage`. `resolveTheme` turns "system" into light or dark. |
| `LocationContext` | Saved cities and the active city. `selectLocation` switches city and saves it; `removeLocation` never leaves the list empty. |
| `WaterContext` | Water records with add, update and delete. Saves to `localStorage` and, when the backend is reachable, mirrors every change to it (`mirror`). `syncStatus` says whether that is happening. |
| `EnvironmentDataContext` | Shares one `useEnvironmentData` result with every page, so data is fetched once. |
| `ToastContext` | `showToast(message)` shows a short notice that disappears after 4 seconds. |
| `hooks/useEnvironmentData` | Loads air and weather together, cancels old requests when the city changes, ignores slow responses that arrive late, runs auto-refresh, and switches to demo data only when asked. |
| `hooks/useCityComparison` | Loads every saved city at once with `Promise.allSettled`, so one failure does not hide the rest. `sortByAqi` ranks the cleanest air first. |

---

## 5. `src/components/`: building blocks of the screen

| File | Contents |
| --- | --- |
| `ui/index.tsx` | `Card`, `Button`, `Badge`, `TextField`, `Spinner`, `SkeletonBlock`, `EmptyState`, `ErrorState`, `OriginBadge` (live, yours or demo), `ProvenanceFooter` (source, standard, time), `DemoDataBanner`, `DisclaimerNote` and `SyncIndicator`. |
| `StatCard.tsx` | `StatCard` (a metric tile) and `PageHeader`. |
| `air/index.tsx` | `AqiGauge` (an SVG arc drawn with `describeArc`), `AqiScaleStrip`, `PollutantCard`, `PollutantGrid` and `AqiAdvice`. |
| `air/AqiReading.tsx` | The large overview reading. `lastDayOfReadings` takes the newest 24 hours, and `HourStrip` draws one coloured bar per hour on a fixed 0–300 scale. |
| `air/AqiForecast.tsx` | The next-24-hour card. `findForecastExtremes` loops once to find the best and worst hour. |
| `charts/` | Recharts line and area charts for AQI, pollutants, weather and water. `useChartTheme` gives the light or dark chart colours. |
| `map/EnvironmentMap.tsx` | The Leaflet map. `buildPinIcon` makes a round pin coloured by AQI, `buildWaterIcon` a square pin for water samples, and `RecenterOnChange` moves the map when the city changes. |
| `water/WaterMeasurementForm.tsx` | The entry form with validation. `previewScore` scores the sample live while it is typed, and `isoToLocalInput` / `localInputToIso` convert dates for the date-time field. |
| `water/WaterMeasurementTable.tsx` | The history table with expandable rows. |
| `layout/` | `AppLayout` (the page frame), `Sidebar`, `TopBar`, `BrandMark` (logo), `navItems` (the menu list), `CommandMenu` (Ctrl+K; `filterCommands` keeps commands whose label contains every typed word) and `AqiAlertBanner` (`isAboveAlertThreshold` decides whether to show it). |
| `LocationSearch.tsx` | City search with a 350 ms debounce and a "Use my current location" button. |
| `ServerStats.tsx` | The "On the server" panel in Settings. `mostCommonSource` finds the most frequent source type. |
| `ErrorBoundary.tsx` | Wraps the whole app; if anything crashes while drawing, it shows the error and a recovery message instead of a blank screen. |

---

## 6. `src/pages/`: the screens

| Page | What it shows |
| --- | --- |
| `Overview` | Headline AQI, weather tiles, trend chart, observations and water summary. `buildObservations` writes plain sentences from the numbers on screen. |
| `AirQuality` | Gauge, health advice, the six pollutants, the forecast, history charts and the sub-index calculation table. |
| `WaterQuality` | Add, edit and delete samples, the history table, a trend chart, sample comparison and the scoring method. |
| `EnvironmentMapPage` | The map, with every saved city coloured by its live AQI. |
| `Analytics` | Long-term charts. `summarise` gives the min, max and mean; `peakHour` finds the worst hour. Includes CSV export. |
| `Compare` | Saved cities ranked by AQI (`CityRow` draws one row). |
| `Report` | A printable one-page summary (`window.print()`). |
| `Education` | Four tabs on AQI, pollutants, water indicators and what you can do. |
| `Settings` | Preferences, the AQI alert, data management and server statistics. |
| `NotFound` | Shown for unknown addresses. |

---

## 7. `backend/`: Express + Prisma + SQLite

| File | What it does |
| --- | --- |
| `prisma/schema.prisma` | Database tables: `Location`, `AirReading`, `WaterReading` (monitoring stations) and `WaterSample` (records from the web app). |
| `prisma/seed.js` | `main()` clears the station tables and inserts three sample stations, computing their scores with the calculators. |
| `server.js` | Sets up Express with CORS and JSON parsing, the `/api/health` and `/api/locations` endpoints, the water-samples router, a JSON 404 for unknown routes and a JSON error handler. It only starts listening when run directly, so the tests can import it. |
| `src/routes/waterSamples.js` | `validateSample` checks every field and range; `toRecord` and `toJson` convert between JSON and database rows; `average` and `summariseSamples` build the statistics; `waterSamplesRouter` defines the routes below. |
| `src/utils/calculators.js` | `truncate`, `interpolate` (the EPA formula), `calculateAQI(pm25, pm10)` (the higher sub-index wins) and `calculateWQI(ph, turbidity)`, a simpler two-parameter score used for the station data. |
| `test/api.test.js` | API tests run against a temporary copy of the database. |

**Water-sample routes**

| Method and path | Result |
| --- | --- |
| `GET /api/water-samples` | All samples, newest first |
| `GET /api/water-samples/stats` | Total, demo count, latest date, averages and count per source |
| `GET /api/water-samples/:id` | One sample, or 404 |
| `PUT /api/water-samples/:id` | Create (201) or update (200); 400 with a list of errors if invalid |
| `DELETE /api/water-samples/:id` | Delete one, or 404 |
| `DELETE /api/water-samples?demo=true` | Delete only demonstration samples (without `?demo=true`, deletes all) |

---

## 8. Questions you may be asked

**Why is the overall AQI the maximum of the sub-indices and not the average?**
Being exposed to one dangerous pollutant is not made safer by the others being low,
so EPA reports the worst one. See `calculateOverallAqi`.

**Why truncate instead of round?**
EPA's method says so. It also stops a value such as 9.05 from landing between two
bands (9.0 and 9.1). See `truncate`.

**Where does the water score come from?**
`assessWaterMeasurement`: each parameter gets a 0–100 sub-score from
`interpolateScore`, and the weighted sum is the composite. It is an educational
score, not a drinking-water safety test, and the app says so wherever a score is
shown.

**What if the backend is not running?**
`WaterContext` sets `syncStatus` to `local-only` and keeps everything in the
browser. When the server is back, the next start-up merges both lists with
`mergeWaterSamples`.

**What if the air quality API fails?**
`useEnvironmentData` shows an error with "Try again" and an explicit "Show
demonstration data" button. Demo data is never shown without the user choosing it.

**How do you stop an old request from overwriting a new one?**
Each request gets an id (`requestIdRef`); a response whose id is not the latest is
ignored, and an `AbortController` cancels it.

**How is the forecast kept separate from the history?**
`observedHours` keeps times up to the current hour and `forecastHours` keeps the 24
after it. Both compare ISO time strings, which sort correctly as text.

**How is the project tested?**
`npm test` runs 203 frontend tests (calculations, services, contexts, components
and whole-app navigation). `npm run test:backend` runs 12 API tests on a throwaway
copy of the database.
