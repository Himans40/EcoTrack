# Architecture

Technical reference for the Air and Water Quality Index and Environment
Monitoring System: how the pieces fit together, how data moves through them, and
why the structure is shaped the way it is.

---

## 1. High-level shape

A single-page React application with no backend. It talks directly to public,
key-less HTTP APIs for air quality, weather and geocoding, and uses the browser's
own `localStorage` as its database for user-entered water measurements and
preferences.

```
┌──────────────────────────────────────────────────────────────────┐
│                          BROWSER                                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  React application (Vite bundle)                           │  │
│  │                                                            │  │
│  │  Pages ── Components ── Contexts ── Hooks                   │  │
│  │                            │                               │  │
│  │                 ┌──────────┴──────────┐                    │  │
│  │                 │                     │                    │  │
│  │            lib/ (pure)          services/ (I/O)            │  │
│  │       aqi, wqi, csv, format      http, API clients         │  │
│  │       storage, guards, id        demo data generator       │  │
│  └────────────────────┬──────────────────────┬────────────────┘  │
│                       │                      │                   │
│              ┌────────┴────────┐    ┌────────┴────────┐          │
│              │  localStorage   │    │   fetch()       │          │
│              └─────────────────┘    └────────┬────────┘          │
└──────────────────────────────────────────────┼───────────────────┘
                                               │ HTTPS
                     ┌─────────────────────────┼─────────────────────────┐
                     ▼                         ▼                         ▼
        Open-Meteo Air Quality      Open-Meteo Forecast      Open-Meteo Geocoding
                                                                         +
                                                           OpenStreetMap tiles
```

### Why no backend

A server was considered and deliberately left out. Every data source the project
needs is a public, CORS-enabled, key-less API, so a server would only proxy
requests the browser can already make. The one thing a backend would genuinely
add — syncing water records across devices — is listed as a future enhancement
rather than built, because it would require authentication, hosting and a database
for a single-user college project. Leaving it out means the project runs anywhere
with `npm install && npm run dev` and no configuration at all.

---

## 2. Layering

The codebase is organised so that each layer only depends on the ones below it.

| Layer | Directory | Depends on | May do I/O? |
| --- | --- | --- | --- |
| Pages | `src/pages/` | everything below | no (delegates) |
| Components | `src/components/` | lib, types, contexts | no |
| Contexts | `src/context/` | hooks, lib, services | yes (via hooks/services) |
| Hooks | `src/hooks/` | services, lib | yes |
| Services | `src/services/` | lib, types | **yes — the only I/O layer** |
| Library | `src/lib/` | types only | **no — pure functions** |
| Types | `src/types/` | — | no |

**`src/lib/` is pure on purpose.** `aqi.ts`, `wqi.ts`, `csv.ts` and `format.ts`
contain no `fetch`, no `localStorage` access and no React. That is what makes the
core calculations — EPA breakpoint arithmetic, the water quality index, CSV
escaping — directly unit-testable without mocks, which is where the bulk of the
test suite lives.

`storage.ts` is the one partial exception: it touches `localStorage`, but every
access is wrapped in try/catch and the module exposes a pure validator interface.

---

## 3. Core domain modules

### 3.1 `lib/aqi.ts` — the AQI engine

The single source of truth for everything index-related.

**Category table.** Six EPA categories, each with its numeric range, a Tailwind
class string for badges and a hex colour for charts and map markers. Two colour
representations exist because Recharts and Leaflet need concrete values while the
UI needs contrast-checked utility classes.

**Breakpoint tables.** For each of the six pollutants:

```ts
interface BreakpointTable {
  convert: (ugPerM3: number) => number  // to the EPA's own unit
  decimals: number                      // EPA truncation precision
  breakpointUnit: string                // 'µg/m³' | 'ppm' | 'ppb'
  bands: readonly [number, number, number, number][]
}
```

**Sub-index calculation** follows the EPA method exactly:

1. Convert µg/m³ to the unit the breakpoints use. Particulates need no
   conversion; the four gases are converted with the ideal-gas molar volume at
   25 °C and 1 atm: `ppb = µg/m³ × 24.45 / M`.
2. **Truncate** (not round) to the EPA's precision for that pollutant.
3. Find the band containing the truncated value.
4. Apply the piecewise-linear formula:

   ```
   I = (I_hi − I_lo) / (BP_hi − BP_lo) × (C − BP_lo) + I_lo
   ```

5. Round the result to an integer.

**Overall AQI is the maximum of the sub-indices**, never an average, and the
pollutant producing that maximum is reported as the dominant pollutant.

`calculateSubIndexDetailed()` returns the converted value and a `capped` flag
alongside the index, which is what the air quality page's "Sub-index Calculation"
table renders — so a reader can follow the arithmetic step by step.

**Null discipline:** a missing or negative concentration returns `null`, never 0.
A pollutant with no reading is skipped in the aggregate rather than dragging it down.

### 3.2 `lib/wqi.ts` — the water quality index

Each of the six parameters has a **piecewise-linear scoring curve** defined as
`[value, score]` anchor points, interpolated and clamped at both ends. Anchors
were chosen so that a parameter inside its acceptable band scores 100 and the
score falls away as the reading moves outside.

The composite is a weighted sum:

```
score = Σ (subScoreᵢ × weightᵢ)
```

| Parameter | Weight | Acceptable range |
| --- | --- | --- |
| Turbidity | 22% | ≤ 5 NTU (≤ 1 preferred) |
| Dissolved oxygen | 22% | ≥ 6 mg/L |
| pH | 18% | 6.5 – 8.5 |
| Total dissolved solids | 18% | ≤ 500 mg/L desirable |
| Electrical conductivity | 12% | ≤ 750 µS/cm |
| Water temperature | 8% | 10 – 25 °C |

Weights sum to exactly 1, which `totalParameterWeight()` asserts and a test
verifies, so the composite is guaranteed to land in 0–100.

Turbidity and dissolved oxygen carry the most weight because they are the two
parameters most directly tied to contamination and to whether aquatic life can
survive. Temperature carries the least because it is contextual rather than a
quality judgement in itself.

`WATER_SAFETY_DISCLAIMER` is exported as a single constant and rendered wherever a
score appears, so the caveat can never drift out of sync between pages.

### 3.3 `lib/csv.ts` — export

RFC 4180 escaping written by hand rather than pulled in as a dependency: a field
is quoted when it contains a comma, quote or line break, and embedded quotes are
doubled.

It also guards against **CSV injection**: a field starting with `=`, `+`, `-` or
`@` is prefixed with an apostrophe, because a spreadsheet would otherwise evaluate
it as a formula.

Every exported row carries a **Data Origin** column, so the file stays
self-describing once it leaves the application.

### 3.4 `lib/storage.ts` + `lib/guards.ts` — persistence

`localStorage` holds untyped strings written by possibly older versions of the
app, so every read goes through a validator:

```ts
readStorage<T>(key: string, fallback: T, validate: (v: unknown) => v is T): T
```

The fallback is returned when the key is absent, the JSON is corrupt, or the
parsed value fails the type guard. Combined with try/catch around every access,
this means a bad stored value can never crash the application at startup — it is
simply discarded.

Four keys are used, all namespaced and versioned:

```
ems.settings.v1
ems.locations.v1
ems.activeLocation.v1
ems.waterMeasurements.v1
```

The `.v1` suffix means a future breaking change to a stored shape can ship under
`.v2` without needing a migration path for data that would fail validation anyway.

---

## 4. Service layer and the request lifecycle

### 4.1 `services/http.ts`

One helper wraps every outbound request:

- **Hard timeout** (15 s) via an internal `AbortController`, combined with any
  caller-supplied signal, so a slow network and an unmounting component both abort
  cleanly.
- **Error normalisation** into an `ApiError` carrying a message safe to show the
  user. Open-Meteo returns `{"error": true, "reason": "..."}` with a 4xx status, so
  the provider's own reason is surfaced rather than a bare status code. A
  `TypeError` from `fetch` becomes "Could not reach the data provider".
- **`isAbortError()`** so callers can distinguish a deliberate cancellation from a
  real failure and stay silent about it.

### 4.2 Timestamp handling

This is the subtlest part of the service layer.

Requests use `timezone=auto`, so Open-Meteo returns **naive local wall-clock
strings** for the location — `"2026-11-11T03:30"` — plus a `utc_offset_seconds`
field. Parsing that string directly with `new Date()` would interpret it in the
*browser's* timezone, which is wrong whenever the user monitors a city in another
zone.

The application therefore keeps **both** representations:

| Use | Representation | Produced by |
| --- | --- | --- |
| Chart axis labels, "observation hour" | naive local string, used as-is | the API |
| Data-freshness ("48 minutes ago") | true UTC instant | `localTimeToUtcIso()` |

`localTimeToUtcIso()` parses the naive string *as if* it were UTC, then subtracts
the location's offset to recover the real instant. Chart labels then show the
location's own wall clock regardless of where the viewer is, while freshness
indicators remain correct.

### 4.3 Discarding forecast hours

Open-Meteo returns forecast hours alongside history. Charts labelled "historical"
must not contain them, so both the air quality and weather clients filter:

```ts
points.filter((point) => point.time <= currentLocalTime)
```

Both timestamps are naive local strings in the same timezone, and ISO-8601 sorts
lexicographically, so a plain string comparison is exact here and avoids timezone
arithmetic entirely. The remaining points are then trimmed to the requested window
from the newest end.

### 4.4 `services/demoData.ts`

Synthetic data is generated by a seeded **mulberry32** PRNG so the output is
deterministic — the same city always produces the same profile, which keeps
screenshots and a live demonstration reproducible.

A `diurnalFactor(hour)` function shapes concentrations so they peak around the
morning and evening traffic rush and dip mid-afternoon when the boundary layer is
deepest, with ozone running counter to the traffic pollutants. The result looks
like real data rather than noise.

Crucially, the generated concentrations are run through **the same EPA engine**
the live path uses, so demonstration data is internally consistent with the rest
of the application — and every dataset it returns is tagged `origin: 'demo'` with
an explicit note.

---

## 5. State management

Four React contexts, nested in dependency order in `App.tsx`:

```
<ErrorBoundary>
  <SettingsProvider>            theme, units, refresh interval, history window
    <LocationProvider>          saved locations, active location
      <WaterProvider>           water measurement CRUD
        <EnvironmentDataProvider>   one shared air + weather fetch
          <BrowserRouter> … </BrowserRouter>
```

Settings is outermost because the theme must be applied before anything renders.
`EnvironmentDataProvider` is innermost of the three data providers because it
depends on the active location.

**Why contexts rather than a state library:** the state here is small, naturally
hierarchical and changes infrequently. Redux or Zustand would add a dependency and
indirection without solving a problem this application has.

**Why `EnvironmentDataProvider` exists:** four of the seven pages need air quality
data. If each called the fetching hook itself, navigating between them would
re-request the same two endpoints every time. Hoisting the hook into a provider
means one request per location change, and the top-bar refresh button updates every
page at once.

### `hooks/useEnvironmentData.ts`

Owns the fetching lifecycle:

- Loads air quality and weather **together** with `Promise.all`, so the dashboard
  never shows half a state.
- Keeps previously loaded data visible during a background refresh
  (`isRefreshing`) rather than flashing a skeleton.
- Aborts in-flight requests when the location or history window changes, and on
  unmount.
- Guards against **out-of-order responses** with a monotonically increasing
  `requestIdRef`: a slow earlier request that resolves after a newer one is
  discarded.
- Runs the optional auto-refresh timer, which is skipped entirely while
  demonstration data is displayed, because there is nothing to refresh from.
- Exposes `useDemoData()` as an explicit, user-triggered switch — never automatic.

---

## 6. Routing

`react-router-dom` v7 with a single layout route:

| Path | Page |
| --- | --- |
| `/` | Overview dashboard |
| `/air-quality` | Air quality monitoring |
| `/water-quality` | Water quality monitoring |
| `/map` | Environmental map |
| `/analytics` | Historical analytics |
| `/learn` | Environmental education |
| `/settings` | Settings |
| `/education` | redirect → `/learn` |
| `*` | Not found |

Navigation items are defined once in `components/layout/navItems.ts`, and both the
desktop sidebar and the mobile drawer render from that list, so they cannot drift
apart. A test asserts that every item in the list navigates to a page that renders.

---

## 7. Chart implementation

All charts are Recharts components wrapped in `ResponsiveContainer`.

**Theming.** Recharts needs concrete colour values rather than CSS classes, so
`useChartTheme()` derives a palette from the resolved theme and passes it down as
props. That is why the charts respond correctly to the light/dark toggle.

**Air charts** are plotted against `point.time` — the provider's own hourly
timestamps. `AqiTrendChart` additionally draws EPA category thresholds as
`ReferenceLine`s, but only those the data actually reaches, so a low-AQI city does
not get a squashed axis.

**Water charts** are plotted against `sampledAt` — the timestamps the user
recorded. Because samples are taken at irregular intervals, points are drawn as
**visible markers**; the connecting line is a visual aid and does not imply
readings in between. A single sample renders as a `ScatterChart` rather than a line
with nothing to connect.

**Code splitting.** The Leaflet map is the heaviest dependency and only one page
needs it, so `EnvironmentMapPage` imports it with `React.lazy()` behind a
`Suspense` boundary. The production build confirms this: Leaflet lands in its own
~158 kB chunk that the other six pages never download.

---

## 8. Map implementation

`react-leaflet` over OpenStreetMap raster tiles.

**Custom `divIcon` markers** instead of Leaflet's default image icons. This solves
two problems at once: it avoids the well-known bundler asset-path issue with
Leaflet's default marker images, and it lets each marker carry meaning — a round
pin coloured by the AQI actually fetched, or a diamond pin coloured by a water
sample's composite score.

**Only verifiable points are drawn.** Monitoring locations come from geocoded
coordinates; water samples appear only when the user supplied coordinates
themselves. Saved locations other than the active one get a neutral grey pin
because no AQI has been fetched for them — the application shows no value rather
than a guessed one, and says so in the legend.

A `RecenterOnChange` child component uses `useMap()` to re-centre when the active
location changes.

---

## 9. Build and bundling

```
dist/index.html                      1.08 kB
dist/assets/index-*.css             38.87 kB  (gzip 6.98 kB)
dist/assets/EnvironmentMap-*.css    15.04 kB  (gzip 6.38 kB)
dist/assets/icons-*.js               9.17 kB  (gzip 3.59 kB)
dist/assets/index-*.js             155.37 kB  (gzip 43.86 kB)
dist/assets/EnvironmentMap-*.js    157.87 kB  (gzip 46.43 kB)   ← lazy
dist/assets/react-vendor-*.js      179.74 kB  (gzip 59.20 kB)
dist/assets/charts-*.js            429.06 kB  (gzip 114.75 kB)
```

`manualChunks` splits React, Recharts and Lucide into separate vendor chunks.
These change far less often than application code, so a returning visitor keeps
them cached across deployments.

---

## 10. Testing strategy

Vitest with the jsdom environment, sharing Vite's transform pipeline so tests run
against the same module resolution as the app. `vitest.config.ts` merges
`vite.config.ts` rather than duplicating the `@/` alias.

Three levels:

1. **Pure unit tests** over `lib/` — the majority. No mocks needed, because the
   modules have no I/O. Boundary values come straight from the EPA tables, so the
   assertions are correct by definition rather than snapshots of our own output.
2. **Service tests** with a mocked `fetch`, using response fixtures shaped exactly
   like the real endpoint's (verified against a live call). These cover the
   error-prone parts: forecast trimming and timestamp conversion.
3. **Component and integration tests** with React Testing Library — the full water
   CRUD lifecycle through its real provider, form validation, and an app-level test
   that walks every navigation item.

`src/test/setup.ts` installs four polyfills jsdom lacks: `localStorage` (Node 26
ships a disabled native global that shadows jsdom's), `matchMedia`,
`ResizeObserver` (Recharts constructs one on mount) and `scrollTo`.

---

## 11. Accessibility and responsive design

- Semantic landmarks: `<nav aria-label>`, `<main>`, `<header>`, `<table><caption>`
- Every form input has an associated `<label>`; errors are linked with
  `aria-describedby` and flagged with `aria-invalid`
- Status messages use `role="status"` / `role="alert"` with `aria-live`
- A visible focus ring on every interactive element
- `prefers-reduced-motion` is respected globally
- Icons are `aria-hidden`; icon-only buttons carry `aria-label`
- Mobile-first Tailwind breakpoints; the sidebar collapses to a drawer below `lg`,
  and tables scroll horizontally inside their container rather than breaking the
  page layout
