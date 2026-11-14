# Project Report

## Air and Water Quality Index and Environment Monitoring System

**Problem statement (as issued):** Air and water quality index and environment monitoring
**Project type:** Application Development — Major Project

**Team:** Shambhavi · Rameez Rahman · Himanshu

---

## Table of contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Problem statement](#3-problem-statement)
4. [Objectives](#4-objectives)
5. [Background review](#5-background-review)
6. [Limitations of existing systems](#6-limitations-of-existing-systems)
7. [Proposed system](#7-proposed-system)
8. [Functional requirements](#8-functional-requirements)
9. [Non-functional requirements](#9-non-functional-requirements)
10. [System architecture](#10-system-architecture)
11. [System design](#11-system-design)
12. [Implementation](#12-implementation)
13. [Testing methodology](#13-testing-methodology)
14. [Verified results](#14-verified-results)
15. [Limitations](#15-limitations)
16. [Future scope](#16-future-scope)
17. [Conclusion](#17-conclusion)

---

## 1. Abstract

Air and water pollution are measured constantly, yet the measurements rarely reach
the people affected by them in a form they can act on. A concentration reading in
micrograms per cubic metre means little without the index, the category and the
trend that give it meaning; and for water, measurements are frequently taken in the
field or in a college laboratory and then lost in a notebook.

This project is a working web application that addresses both halves of that gap.
For air, it retrieves live pollutant concentrations for any searchable location,
computes and displays the United States EPA Air Quality Index, explains what the
number means, and charts how it has moved over the preceding hours or days. For
water, it provides a complete measurement record system: six physico-chemical
parameters can be entered, validated, scored against a documented composite index,
charted over time, mapped, edited, deleted and exported as CSV, with everything
persisted locally.

The design principle that shaped the whole build is **data provenance**. Every
value carries a record of where it came from, and the interface renders that
origin as a visible label: *live API data*, *your recorded data*, or *demonstration
data*. Synthetic values never appear unless a user explicitly asks for them, index
standards are never mixed, and the water quality score is never presented as a
determination that water is safe to drink.

The result is a React and TypeScript single-page application of roughly 9,150 lines
of source across 44 modules, with 181 automated tests across 11 test files, all
passing, and a production build that completes with no warnings.

---

## 2. Introduction

Environmental monitoring has two distinct problems, and they are not the same
problem.

For **air quality**, data exists in abundance. Satellite instruments, ground
stations and atmospheric models produce continuous global coverage, and several
providers expose it over free HTTP APIs. The difficulty is interpretation. A PM2.5
concentration of 60 µg/m³ is meaningless to a general reader. It becomes meaningful
only when converted into an index with defined categories and health guidance — and
even then, only if the reader knows *which* index, because the same concentration
lands in different categories under the US EPA AQI, India's CPCB National AQI and
the European EAQI.

For **water quality**, the problem is inverted. Interpretation is comparatively
well understood — there are published acceptable ranges for pH, turbidity,
dissolved oxygen and dissolved solids — but the data does not exist in any
retrievable form. There is no free public API that reports real-time measurements
for an arbitrary river, well or tap anywhere in the world. Water quality data is
produced by people with instruments, sample by sample.

A monitoring system that treats these two as the same problem will get one of them
wrong. The common failure is to fabricate the water half: generate plausible
numbers, display them next to the real air data, and let a reader assume both are
live. This project refuses that approach. The air half is a client for real data;
the water half is a record system for data the user actually measures. The interface
makes the difference impossible to miss.

---

## 3. Problem statement

> **Air and water quality index and environment monitoring**

Interpreted as a system specification, this requires:

- Retrieving air quality data for a user-selected location and converting it into a
  recognised index with categories and health guidance
- Capturing water quality measurements and assessing them against published guidance
- Presenting both over time, so change is visible rather than only a snapshot
- Locating observations geographically
- Explaining the underlying environmental science to a non-specialist audience
- Doing all of this without misrepresenting the provenance or precision of any value

---

## 4. Objectives

| # | Objective | Status |
| --- | --- | --- |
| O1 | Retrieve and display live air quality for any searchable location | Achieved |
| O2 | Compute the US EPA AQI from concentrations, with visible working | Achieved |
| O3 | Provide full CRUD and local persistence for water measurements | Achieved |
| O4 | Score water samples against a documented, transparent index | Achieved |
| O5 | Visualise air and water data over time using real timestamps | Achieved |
| O6 | Map monitoring locations and sampling points | Achieved |
| O7 | Explain AQI, pollutants, water indicators and conservation measures | Achieved |
| O8 | Label the provenance of every value shown | Achieved |
| O9 | Export records in an interoperable format | Achieved (CSV) |
| O10 | Work on mobile and desktop, in light and dark themes | Achieved |

---

## 5. Background review

This section reviews the **standards and existing systems** the project builds on.
It is a review of primary technical documentation rather than of academic
literature, and no source is cited here that the reader cannot open directly.

### 5.1 Air quality index methodology

The United States Environmental Protection Agency defines the AQI in its *Technical
Assistance Document for the Reporting of Daily Air Quality — the Air Quality Index*
(document EPA 454/B-24-002). The method is a piecewise-linear mapping from
pollutant concentration to a 0–500 index:

```
I = (I_hi − I_lo) / (BP_hi − BP_lo) × (C − BP_lo) + I_lo
```

Three properties of the method matter for implementation and are frequently
implemented incorrectly:

1. **The overall AQI is the maximum of the pollutant sub-indices, not an average.**
   The index deliberately reports the worst pollutant, because exposure to one
   dangerous pollutant is not made safer by the others being low.
2. **Concentrations must be truncated, not rounded,** to a defined precision before
   the breakpoint lookup — one decimal for PM2.5, whole numbers for PM10.
3. **Breakpoints for gases are defined in ppm or ppb,** while most providers report
   µg/m³, so a unit conversion is required before the lookup.

The EPA revised the PM2.5 breakpoints in May 2024, lowering the Good/Moderate
boundary from 12.0 to 9.0 µg/m³. This project implements the revised values.

### 5.2 Competing index standards

The same air is classified differently by different national standards. India's
Central Pollution Control Board National AQI and the European Environment Agency's
EAQI both use breakpoints that differ from the EPA's, and the EAQI runs on a
different scale entirely. A system that takes a numeric value computed under one
standard and a category label from another produces a figure that means nothing.
This directly motivated the design decision in §7.2.

### 5.3 Water quality assessment

Two widely published sources define acceptable ranges for the parameters this
project records:

- The **World Health Organization**, *Guidelines for Drinking-water Quality*
- The **Bureau of Indian Standards**, **IS 10500** — *Drinking Water — Specification*

Both establish that physico-chemical parameters alone are insufficient to determine
potability. Both require bacteriological testing (E. coli / total coliforms),
heavy metal analysis (arsenic, lead, fluoride, nitrate) and, for treated supplies,
residual disinfectant. This is the single most important constraint on what this
project's water module can honestly claim, and §7.3 explains how it is handled.

The idea of combining several parameters into a single weighted index is long
established in water resource management. There is no single canonical formulation;
different authorities weight parameters differently according to the use the water
is being assessed for. This project therefore defines and documents **its own**
weighting rather than claiming to implement a standard one.

### 5.4 Available data sources

| Source | Coverage | Key required | Suitable? |
| --- | --- | --- | --- |
| Open-Meteo Air Quality API | Global, hourly, CAMS model | No | **Selected** |
| Open-Meteo Geocoding (GeoNames) | Global city database | No | **Selected** |
| OpenStreetMap raster tiles | Global base map | No | **Selected** |
| Commercial air quality APIs | Global, station-based | Yes, with quotas | Rejected — key management |
| Government portals (e.g. CPCB) | National, station-based | Varies | Future scope |
| Public water quality APIs | — | — | **None found with global coverage** |

Open-Meteo serves the Copernicus Atmosphere Monitoring Service (CAMS) global
forecast. An important property follows: these are **modelled estimates
interpolated to the requested coordinates**, not readings from a physical station
at that point. The application states this rather than implying station precision.

The last row is the finding that shaped the water module. No free public API
reports real-time pH, turbidity, dissolved oxygen, TDS, conductivity and
temperature for an arbitrary water body. The choice was therefore between
fabricating data and building a record system — and the second is both more honest
and more genuinely useful.

---

## 6. Limitations of existing systems

Reviewing publicly available air quality dashboards and comparable student
projects, four recurring weaknesses stood out and were treated as requirements to
avoid.

| # | Weakness | How this project addresses it |
| --- | --- | --- |
| L1 | **Opaque provenance.** Values are shown with no indication of whether they are live, cached or fabricated. | Every dataset carries a `DataProvenance` record rendered as a visible origin chip and footer. |
| L2 | **Mixed index standards.** A number computed under one standard is shown with another's category labels. | One standard — US EPA AQI — used throughout and stated on every page where an index appears. |
| L3 | **Fabricated water and sensor data.** Plausible-looking readings presented as live telemetry from stations that do not exist. | Water data is user-entered and labelled as such. No fictional monitoring stations are placed on the map. |
| L4 | **Unqualified safety claims.** A composite score presented as though it establishes potability. | The safety disclaimer is a single exported constant rendered wherever a score appears, and the education section explains what the six parameters cannot detect. |

Two further common weaknesses were also addressed: **no visible working** behind
the index number, which this project remedies with a sub-index calculation table;
and **silent failure**, which it remedies with explicit error states offering retry
or a clearly labelled demonstration dataset.

---

## 7. Proposed system

### 7.1 Overview

A client-side single-page application that fetches live air quality, weather and
geocoding data from public key-less APIs, and uses browser storage as its database
for user-entered water measurements and preferences. Seven pages: Overview, Air
Quality, Water Quality, Environmental Map, Historical Analytics, Environmental
Education and Settings.

No backend. Every data source needed is a public, CORS-enabled, key-less API, so a
server would only proxy requests the browser can already make. The one capability a
backend would genuinely add — syncing records across devices — is listed as future
scope rather than built, because it would require authentication, hosting and a
database for a single-user project. The benefit is that the project runs anywhere
with `npm install && npm run dev` and no configuration whatsoever.

### 7.2 Design decision: one index standard

Given §5.2, the system commits to the **US EPA AQI** and never mixes thresholds.
The live index value is the provider's own `us_aqi` field; the breakpoint
implementation in `lib/aqi.ts` supplies per-pollutant sub-indices, the
demonstration dataset and a fallback when `us_aqi` is absent. The two are never
blended, and the standard is named on the air quality page, in Settings and in the
education section.

### 7.3 Design decision: water as a record system

Given §5.4, the water module is a field-record system rather than an API client.
The user records measurements; the application stores, validates, scores, charts,
maps and exports them. Three rules are enforced throughout:

1. Records are labelled **"Manual user entry"** — in the interface, in the CSV
   export's Data Origin column, and in each record's metadata.
2. The composite score is described as an **educational composite indicator**, with
   its weighting scheme published in the interface itself.
3. The safety disclaimer accompanies every score.

### 7.4 Design decision: demonstration data as an explicit choice

A demonstration dataset exists so the application remains reviewable without
network access, and so the water module can be demonstrated before any data has
been entered. It is generated by a seeded deterministic function, tagged
`origin: 'demo'`, rendered with an amber banner and chip, and — critically — is
**never a silent fallback**. When an API call fails, the user sees an error state
with a retry button and a separate, explicitly labelled button to switch to
demonstration data.

---

## 8. Functional requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR1 | Search for a city by name and select it as the monitoring location | P0 | Implemented |
| FR2 | Save multiple locations and switch between them | P1 | Implemented |
| FR3 | Display current US EPA AQI with category and dominant pollutant | P0 | Implemented |
| FR4 | Display current concentrations of PM2.5, PM10, CO, NO₂, SO₂, O₃ | P0 | Implemented |
| FR5 | Display the EPA sub-index for each pollutant | P0 | Implemented |
| FR6 | Show the sub-index calculation, including unit conversion | P2 | Implemented |
| FR7 | Display temperature, humidity, wind speed and precipitation | P0 | Implemented |
| FR8 | Chart AQI and pollutant concentrations over a selectable period | P0 | Implemented |
| FR9 | Create a water quality measurement with six parameters and metadata | P0 | Implemented |
| FR10 | Validate every field against a plausible physical range | P0 | Implemented |
| FR11 | List, edit and delete stored measurements | P0 | Implemented |
| FR12 | Persist measurements, settings and locations across sessions | P0 | Implemented |
| FR13 | Compute a composite water quality score with per-parameter sub-scores | P0 | Implemented |
| FR14 | Chart water parameters over time using recorded timestamps | P0 | Implemented |
| FR15 | Compare samples (highest, lowest, latest breakdown) | P1 | Implemented |
| FR16 | Export measurements as CSV | P1 | Implemented |
| FR17 | Show monitoring locations and water samples on an interactive map | P1 | Implemented |
| FR18 | Provide educational content on AQI, pollutants, water and conservation | P1 | Implemented |
| FR19 | Switch between light, dark and system themes | P1 | Implemented |
| FR20 | Configure temperature unit, refresh interval and chart period | P1 | Implemented |
| FR21 | Load and reset a clearly labelled demonstration dataset | P1 | Implemented |
| FR22 | Display the origin of every dataset shown | P0 | Implemented |
| FR23 | Handle API failure with retry and an explicit demo-data option | P0 | Implemented |
| FR24 | Delete all local data and reset preferences | P1 | Implemented |

All P0 requirements were completed before any P1 or P2 work began.

---

## 9. Non-functional requirements

| ID | Requirement | How it is met | Verified |
| --- | --- | --- | --- |
| NFR1 | Responsive from 320 px to desktop | Mobile-first Tailwind breakpoints; sidebar collapses to a drawer; tables scroll inside their container | Tested at 375×812 |
| NFR2 | No uncaught console errors | Verified across all seven pages in a browser | Zero errors, zero warnings |
| NFR3 | Type safety | TypeScript strict mode, `noUnusedLocals`, `noUnusedParameters` | `tsc -b` clean |
| NFR4 | Graceful degradation | Timeout, abort, normalised errors; defensive storage reads; error boundary | Covered by tests |
| NFR5 | Accessibility | Semantic landmarks, labelled inputs, `aria-describedby` / `aria-invalid`, live regions, visible focus ring, `prefers-reduced-motion` | Manual + test queries by role/label |
| NFR6 | Fast initial load | Vendor chunk splitting; Leaflet lazy-loaded | Main bundle 155 kB (44 kB gzipped) |
| NFR7 | Zero-configuration setup | No API keys, no `.env` required | Verified from a clean install |
| NFR8 | No secrets in the repository | No keys exist to leak; `.gitignore` excludes `.env` | Verified before packaging |
| NFR9 | Maintainability | Layered structure; pure core; one source of truth for nav and disclaimers | — |
| NFR10 | Security | No `dangerouslySetInnerHTML`; CSV injection guard; external links use `rel="noreferrer noopener"` | Covered by tests |

---

## 10. System architecture

```
┌──────────────────────────────────────────────────────────┐
│                       BROWSER                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Pages (7)                                         │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  Components — ui, air, water, charts, map, layout  │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  Contexts — Settings, Location, Water, EnvData     │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  Hooks — useEnvironmentData                        │  │
│  ├──────────────────────────┬─────────────────────────┤  │
│  │  services/  (all I/O)    │  lib/  (pure functions) │  │
│  │  http, airQuality,       │  aqi, wqi, csv,         │  │
│  │  weather, geocoding,     │  storage, guards,       │  │
│  │  demoData                │  format, id             │  │
│  └──────────┬───────────────┴──────────┬──────────────┘  │
│             │                          │                 │
│      ┌──────┴──────┐           ┌───────┴───────┐         │
│      │   fetch()   │           │ localStorage  │         │
│      └──────┬──────┘           └───────────────┘         │
└─────────────┼────────────────────────────────────────────┘
              │ HTTPS
     ┌────────┼────────┬──────────────┬──────────────┐
     ▼        ▼        ▼              ▼              ▼
  Air Quality   Weather   Geocoding   OSM tiles
         (Open-Meteo)                (OpenStreetMap)
```

Each layer depends only on the layers below it. `src/lib/` is deliberately pure —
no `fetch`, no `localStorage`, no React — which is what makes the EPA arithmetic
and the water index directly unit-testable without mocks.

A fuller treatment is in [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 11. System design

### 11.1 Data model

```ts
DataProvenance {
  origin: 'api' | 'user' | 'demo'
  sourceName, sourceUrl, retrievedAt, observedAt, standard, note
}

GeoLocation { id, name, latitude, longitude, country, admin1, timezone, … }

AirQualityDataset {
  location, provenance
  current: { usAqi, category, pollutants[], dominantPollutant, observedAt }
  hourly:  [{ time, usAqi, pm2_5, pm10, co, no2, so2, o3 }]
}

WaterMeasurement {
  id, sampleLocation, sourceType, sampledAt, latitude?, longitude?
  ph, turbidity, dissolvedOxygen, tds, temperature, conductivity
  notes?, createdAt, updatedAt, isDemo?
}

AppSettings { theme, temperatureUnit, refreshIntervalMinutes, historyWindowHours }
```

`DataProvenance` is attached to every dataset. It is the mechanism that makes the
project's central honesty guarantee enforceable in code rather than by convention.

### 11.2 Persistence schema

| Key | Contents |
| --- | --- |
| `ems.settings.v1` | Theme, units, refresh interval, history window |
| `ems.locations.v1` | Array of saved locations |
| `ems.activeLocation.v1` | Currently selected location |
| `ems.waterMeasurements.v1` | Array of water measurement records |

Keys are namespaced and versioned. Every read is validated by a type guard, and the
default is returned when the stored value is absent, corrupt or the wrong shape —
so data written by an older build can never crash the application.

### 11.3 AQI computation

1. Convert µg/m³ to the EPA's unit for that pollutant
   (`ppb = µg/m³ × 24.45 / M`, at 25 °C and 1 atm)
2. Truncate to the EPA's precision
3. Locate the breakpoint band
4. Apply the piecewise-linear formula
5. Overall AQI = **maximum** of the sub-indices; that pollutant is "dominant"

### 11.4 Water quality composite

| Parameter | Weight | Acceptable range |
| --- | --- | --- |
| Turbidity | 22% | ≤ 5 NTU (≤ 1 preferred) |
| Dissolved oxygen | 22% | ≥ 6 mg/L |
| pH | 18% | 6.5 – 8.5 |
| Total dissolved solids | 18% | ≤ 500 mg/L desirable |
| Electrical conductivity | 12% | ≤ 750 µS/cm |
| Water temperature | 8% | 10 – 25 °C |

Each parameter is scored 0–100 by piecewise-linear interpolation across anchor
points encoding its acceptable range; the composite is the weighted sum. Weights
sum to exactly 1. Ratings: Excellent ≥ 85, Good ≥ 70, Fair ≥ 50, Poor ≥ 30,
Very poor < 30.

### 11.5 Navigation

| Path | Page |
| --- | --- |
| `/` | Overview dashboard |
| `/air-quality` | Air quality monitoring |
| `/water-quality` | Water quality monitoring |
| `/map` | Environmental map |
| `/analytics` | Historical analytics |
| `/learn` | Environmental education |
| `/settings` | Settings |

Navigation items are defined once and rendered by both the desktop sidebar and the
mobile drawer, so the two cannot diverge.

---

## 12. Implementation

### 12.1 Technology choices

| Layer | Choice | Rationale |
| --- | --- | --- |
| UI | React 18 | Component model; mature ecosystem |
| Language | TypeScript 5.7 strict | Catches unit and null errors at compile time — critical where µg/m³, ppm and ppb coexist |
| Build | Vite 7 | Fast dev server; optimised production build with code splitting |
| Styling | Tailwind CSS 3 | Consistent tokens; class-based dark mode |
| Routing | React Router 7 | Standard client-side routing |
| Charts | Recharts 2 | Declarative, responsive, composes with React |
| Map | Leaflet 1.9 + React Leaflet 4 | Open-source; no API key; OpenStreetMap tiles |
| Icons | Lucide React | Consistent, tree-shakeable |
| Testing | Vitest 4 + React Testing Library | Shares Vite's transform pipeline |

Dependencies were kept deliberately few: nine runtime packages in total. The CSV
writer, the AQI engine and the water index were written by hand rather than pulled
in, because each is short, each needs to be explainable in a viva, and each is more
valuable as reviewable project work than as a dependency.

### 12.2 Notable implementation problems and their solutions

**Timestamp handling across timezones.** With `timezone=auto`, Open-Meteo returns
naive local wall-clock strings plus a `utc_offset_seconds` field. Parsing those
directly would interpret them in the *browser's* timezone — wrong whenever the user
monitors a city elsewhere. The application keeps both representations: the naive
string for chart labels (so the axis shows the location's own clock) and a true UTC
instant, recovered by `localTimeToUtcIso()`, for freshness indicators.

**Discarding forecast hours.** The API returns forecast hours alongside history.
Charts labelled "historical" must not include them, so both clients filter
`point.time <= currentLocalTime`. Because both are naive local strings in the same
timezone and ISO-8601 sorts lexicographically, a string comparison is exact and
avoids timezone arithmetic entirely.

**Out-of-order responses.** Switching locations quickly can let a slow earlier
request resolve after a newer one. `useEnvironmentData` guards against this with a
monotonically increasing request id; a response whose id is stale is discarded.

**Counts read from a React state updater.** An early implementation of
"load demonstration samples" computed how many records it had added *inside* the
`setState` updater. This worked intermittently, because React only evaluates an
updater eagerly when the update queue is empty. A test caught the inconsistency,
and the logic was moved out of the updater, keeping it pure.

**Leaflet marker assets.** Leaflet's default marker icons break under bundlers.
Using `divIcon` with inline HTML avoided the problem entirely and had the better
side effect of letting each marker carry its own meaning — AQI colour for
monitoring pins, composite-score colour for water sampling pins.

### 12.3 Code metrics

| Metric | Value |
| --- | --- |
| Source modules (excluding tests) | 44 |
| Source lines (excluding tests) | ~9,150 |
| Test files | 11 |
| Test lines | ~2,325 |
| Automated tests | 181 |
| Runtime dependencies | 9 |
| Production bundle (main chunk, gzipped) | 44 kB |

---

## 13. Testing methodology

Testing was organised at three levels, chosen so that the most error-prone logic is
covered by the cheapest and most precise tests.

### 13.1 Unit tests over pure modules

`src/lib/` contains no I/O, so its functions are tested directly with no mocks.
This is where the EPA arithmetic and the water index are verified.

A deliberate choice was made about assertions: wherever possible, expected values
are **boundary values taken from the published EPA breakpoint tables**, so the
assertion is correct by definition rather than a snapshot of the implementation's
own output. For example, PM2.5 at exactly 9.0 µg/m³ must produce AQI 50, and at
9.1 µg/m³ must produce 51, because those are the published band edges. Composite
water scores were computed by hand from the weighting table and asserted as exact
values (97.5 for a clean tap sample, 47.3 for a polluted river sample).

### 13.2 Service tests with a mocked transport

`fetch` is replaced with a mock returning fixtures shaped exactly like the real
endpoint's response — captured from a live call during development. These tests
cover the parts most likely to break silently: request construction, forecast-hour
trimming, local-to-UTC timestamp conversion, provider error propagation, and
missing or null fields.

### 13.3 Component and integration tests

React Testing Library, querying by role and label rather than by implementation
detail. These cover the full water CRUD lifecycle through its real provider
(including persistence and restore after remount), form validation and submission,
and an application-level test that navigates to every item in the navigation list
and asserts the corresponding page renders — directly verifying the requirement
that no navigation item is decorative.

### 13.4 Manual browser verification

Beyond the automated suite, the running application was exercised in a real browser
against live API data: every page, location search and switching, the complete
water CRUD flow, CSV export (intercepted and inspected rather than downloaded),
theme switching, persistence across reloads, the mobile layout at 375 × 812, and
the browser console.

---

## 14. Verified results

Every result below was produced by actually running the command or action stated.

### 14.1 Build and tooling

| Check | Command | Result |
| --- | --- | --- |
| Dependency installation | `npm install` | Succeeded · **0 vulnerabilities** reported by `npm audit` |
| TypeScript compilation | `tsc -b` | **Clean** — no errors, strict mode |
| Production build | `npm run build` | **Succeeded in ~2.8 s**, 2,088 modules, no warnings |
| Development server | `npm run dev` | Started on port 5173 (Vite 7.3.8) |
| Test suite | `npm run test` | **181 passed / 181**, 11 files, 0 failures |

### 14.2 Production bundle

| Asset | Size | Gzipped |
| --- | --- | --- |
| `index.html` | 1.08 kB | 0.50 kB |
| `index-*.css` | 38.87 kB | 6.98 kB |
| `EnvironmentMap-*.css` | 15.04 kB | 6.38 kB |
| `icons-*.js` | 9.17 kB | 3.59 kB |
| `index-*.js` | 155.37 kB | 43.86 kB |
| `EnvironmentMap-*.js` (lazy) | 157.87 kB | 46.43 kB |
| `react-vendor-*.js` | 179.74 kB | 59.20 kB |
| `charts-*.js` | 429.06 kB | 114.75 kB |

Leaflet is confirmed to be code-split into its own chunk, downloaded only when the
map page is opened.

### 14.3 Test results by module

| Test file | Tests | Result |
| --- | --- | --- |
| `src/lib/aqi.test.ts` | 22 | Pass |
| `src/lib/wqi.test.ts` | 25 | Pass |
| `src/lib/csv.test.ts` | 20 | Pass |
| `src/lib/storage.test.ts` | 21 | Pass |
| `src/lib/format.test.ts` | 14 | Pass |
| `src/services/airQuality.test.ts` | 16 | Pass |
| `src/services/geocoding.test.ts` | 8 | Pass |
| `src/services/demoData.test.ts` | 13 | Pass |
| `src/context/WaterContext.test.tsx` | 18 | Pass |
| `src/components/water/WaterMeasurementForm.test.tsx` | 16 | Pass |
| `src/App.test.tsx` | 8 | Pass |
| **Total** | **181** | **All passing** |

### 14.4 Browser verification against live data

Performed in a real browser with the development server running.

| # | Check | Result |
| --- | --- | --- |
| 1 | Application loads and fetches live data | Delhi: **US AQI 211, Very Unhealthy**, 18.8 °C, 78% RH |
| 2 | All seven navigation items render their page | Pass |
| 3 | Location search | "Varanasi" → 5 results with coordinates and population |
| 4 | Location switching and persistence | Switched to Varanasi; **US AQI 177, Unhealthy**; survived reload |
| 5 | Pollutant display with sub-indices | All six rendered; PM2.5 dominant |
| 6 | **Sub-index arithmetic against live data** | PM2.5 141.6 µg/m³ → 217; PM10 199.3 → 199 µg/m³ → 123; O₃ 31.0 → 0.015 ppm → 14; CO 593.0 → 0.5 ppm → 6; SO₂ 17.8 → 6 ppb → 9 — **all matching values computed independently by hand** |
| 7 | Water measurement creation | New record "Ganga ghat — Dashashwamedh" saved and listed |
| 8 | Required-field validation | All six parameters flagged "Required."; submission blocked |
| 9 | Range validation | TDS and conductivity out of range → "Please correct 2 fields above." |
| 10 | Water sub-scores against stored data | Yamuna sample: pH 78, turbidity 14.3, DO 25, TDS 59.6, EC 56.5, temp 88.6 — **matching hand calculations**; composite 47.3 |
| 11 | Two-step delete | Confirm/Cancel shown; confirmed delete reduced 6 → 5 records |
| 12 | Persistence across reload | All 4 storage keys present; records, theme and active location restored |
| 13 | Chart rendering | AQI trend with EPA threshold lines, pollutant, weather and water charts all rendered |
| 14 | CSV export | 19 columns, 7 lines, correct MIME type and date-stamped filename; Data Origin column present |
| 15 | Theme switching | Light / dark / system all applied and persisted |
| 16 | Mobile layout at 375 × 812 | Drawer navigation, 2-column tiles, no horizontal overflow |
| 17 | API failure handling | Error state with **Try again** and **Show demonstration data**; demo banner shown on opt-in |
| 18 | **Browser console** | **Zero errors, zero warnings** across all seven pages |

Check 6 is the most significant: the application's EPA implementation was verified
against live API data by independently computing the sub-indices by hand and
confirming the figures matched exactly.

### 14.5 Defects found and fixed during testing

| Defect | Found by | Resolution |
| --- | --- | --- |
| Record counts read from inside a React state updater returned 0 intermittently | `WaterContext` integration test | Moved the computation out of the updater; kept the updater pure |
| Table rows used a non-keyed fragment, which would log a React key warning | Code review before browser testing | Switched to a keyed `<Fragment>` |
| "Your recorded data" chip was shown even when every record was a demonstration sample | Browser verification | Added `describeMeasurementOrigin()`; the chip now reads "demo" for an all-demo set and states both counts for a mixed set |

---

## 15. Limitations

1. **Air quality values are modelled, not measured at a station.** They come from
   the CAMS global model interpolated to coordinates. Real air quality varies
   sharply over a few hundred metres.
2. **Water quality data is entirely manual.** No public real-time API exists for
   arbitrary water bodies, so the application cannot fetch water data at all.
3. **The water composite index is this project's own.** Its ranges draw on
   published general guidance, but the weighting is ours and the index is not
   certified or regulatory.
4. **The six parameters cannot establish drinking-water safety.** Potability
   requires bacteriological, heavy-metal and residual-disinfectant testing against
   the locally applicable standard.
5. **Storage is per browser.** `localStorage` does not sync across devices, and
   clearing site data erases records. CSV export is the backup path.
6. **AQI is fetched only for the active location**, so other saved locations show a
   neutral map pin rather than a guessed value.
7. **Hourly values against 24-hour breakpoints** are an approximation for
   particulates, which is why the trend matters more than any single reading.
8. **No authentication or multi-user support**, by design.
9. **Ozone above 0.200 ppm** exceeds the EPA 8-hour table; the sub-index is capped
   and flagged rather than extrapolated.
10. **Automated accessibility auditing was not run.** Accessibility was addressed
    by construction and verified manually and through role/label-based test
    queries, but no axe-core or Lighthouse audit was performed.

---

## 16. Future scope

| Enhancement | Value |
| --- | --- |
| Integrate a government network API (e.g. CPCB) as a second labelled source, with a user-selectable index standard | Station-measured data alongside modelled data; direct comparison of standards |
| CSV import of laboratory results | Bulk loading of measurements already recorded elsewhere |
| Additional water fields (coliforms, heavy metals, residual chlorine) | Moves the module closer to a genuine potability assessment |
| Multi-location comparison on one chart | Answers "is our area worse than theirs?" directly |
| PDF report export | A shareable artefact for coursework or a local authority |
| Service worker for offline use | Last successful response remains readable without a network |
| Threshold notifications | Alerts when AQI crosses a user-set value |
| Optional backend with authentication | Record syncing across devices and shared team datasets |

---

## 17. Conclusion

The project delivers a complete, working environmental monitoring application that
satisfies every stated objective. All 24 functional requirements are implemented,
all P0 requirements were completed before optional work began, and the system was
verified both by an automated suite of 181 tests and by manual exercise in a
browser against live data.

The most substantial engineering decision was not technical but definitional:
recognising that air quality and water quality are different data problems and must
be solved differently. Air data exists and needs interpreting; water data does not
exist and must be captured. Treating them identically would have meant fabricating
one half of the system. Instead, the air module is a careful client for real data —
including a visible breakdown of the EPA arithmetic so the index can be checked by
hand — and the water module is a genuinely useful record system for measurements a
student actually takes.

The discipline that followed from that decision shaped everything else: a
provenance record on every dataset, one index standard used consistently, synthetic
data that can only appear when explicitly requested, and a safety disclaimer that
cannot drift because it exists as a single constant. The result is an application
whose limitations are stated as clearly as its capabilities — which, for a system
whose purpose is to report measurements, is the property that matters most.

Verification of the EPA implementation was the most satisfying outcome: sub-indices
computed by the application from live concentrations matched values derived
independently by hand, pollutant by pollutant. The index is not a black box; it is
arithmetic the project can show and defend.
