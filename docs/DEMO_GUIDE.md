# Demonstration Guide

**Air and Water Quality Index and Environment Monitoring System**
Shambhavi · Rameez Rahman · Himanshu

Two parts: a **five-minute walkthrough** to run in front of an examiner, and a
**viva question bank** with answers grounded in what the project actually does.

---

## Part 1 — Five-minute walkthrough

### Before you start (2 minutes, done beforehand)

```bash
npm install
```

```bash
npm run dev
```

1. Open <http://localhost:5173>.
2. **Check you have a working internet connection.** If the room has no network,
   the application still demonstrates fully — see *"If the network fails"* below.
3. Go to **Water Quality → Load sample data** so the water module has records to
   show. Do this in advance; do not spend demo time on it.
4. Set the theme to **Light** in Settings if the projector washes out dark mode.

---

### Minute 0:00 – 0:45 — The problem and the overview

> "Our problem statement was *air and water quality index and environment
> monitoring*. The first thing we found is that these are two different data
> problems, not one. Air quality data exists in abundance and needs interpreting.
> Water quality data for an arbitrary river or well doesn't exist in any public
> API at all — it has to be measured by a person. So the application solves them
> differently, and says clearly which is which."

**Show the Overview dashboard.**

Point at the top row of tiles:

> "This is live data, right now, for Delhi. Air Quality Index 211 — Very
> Unhealthy. Temperature, humidity, and our stored water samples. Notice every
> tile carries a green *Live API data* chip, except the water one, which says
> *recorded by you*. That labelling is the central design rule of the project and
> it runs through every screen."

Point at the gauge and the trend chart:

> "The gauge shows where 211 sits on the 0-to-500 EPA scale — and the bands are
> proportional to their real width, not evenly spaced. The chart is the last 72
> hours using the provider's own hourly timestamps, with the EPA category
> thresholds drawn across it."

---

### Minute 0:45 – 2:00 — Air quality, and showing the working

**Go to Air Quality.**

Point at the blue notice at the top:

> "We report one index standard only: the US EPA AQI. That matters because India's
> CPCB index and the European EAQI use different breakpoints — the same air gets a
> different category under each. Mixing a number from one with a label from
> another gives you a figure that means nothing. So we picked one and we say so on
> every page."

Scroll to the pollutant cards:

> "All six pollutants, each with its own EPA sub-index. PM2.5 is marked
> *Dominant* — that's the pollutant with the highest sub-index, and the overall
> AQI is the **maximum** of these, not the average. The index deliberately reports
> the worst pollutant, because being exposed to one dangerous pollutant isn't made
> safer by the others being low."

**Scroll to the Sub-index Calculation table — this is the strongest moment of the
demo.**

> "This is the part we're most pleased with. The AQI isn't a black box here. Each
> row shows the reported concentration, the value after conversion into the unit
> the EPA table actually uses, the averaging period, and the resulting sub-index.
>
> Look at ozone: reported as 31 µg/m³, but the EPA ozone table is in parts per
> million. We convert with the ideal-gas molar volume at 25 °C and one atmosphere,
> get 0.0157 ppm, truncate — not round, the EPA method requires truncation — to
> 0.015, and look that up to get 14.
>
> We verified this against live data by computing several of these by hand. They
> matched exactly."

---

### Minute 2:00 – 3:30 — Water quality, the honest half

**Go to Water Quality.**

> "There is no free public API that reports real-time pH, turbidity and dissolved
> oxygen for an arbitrary water body anywhere in the world. We looked. So we had a
> choice: generate plausible-looking numbers and display them next to the real air
> data, or build something that handles data a person actually measures. We built
> the second one."

Point at the amber disclaimer:

> "And this appears wherever a score does. The six parameters we record are
> physico-chemical. They tell you nothing about whether water is safe to drink —
> that needs bacteriological testing for E. coli and coliforms, heavy metals, and
> residual disinfectant. We say that rather than letting a good-looking score imply
> something it can't support."

**Click Add measurement.** Fill in just the location, then click **Save
measurement** without the parameters.

> "Every field is validated. Required fields, and physical ranges — pH has to be
> between 0 and 14, and it won't accept a sample time in the future."

Fill it in properly and save. Then **click a row in the history table to expand it**:

> "Each sample gets a composite score out of 100, and this breakdown shows how.
> Every parameter is scored against its acceptable range, and the composite is a
> weighted sum — the weights are published in the interface itself, further down
> the page, and they sum to one."

Point at the **Sample** chips on the demo rows:

> "These five are the demonstration samples I loaded before we started. They're
> labelled everywhere they appear, and Settings has a button to remove them
> without touching real records."

Click **Export CSV**:

> "Full CSV export — every parameter, the computed score, which parameters were out
> of range, and a Data Origin column, so the file stays self-describing after it
> leaves the application."

---

### Minute 3:30 – 4:15 — Map and analytics

**Go to Environmental Map.**

> "OpenStreetMap base layer. The round pin is the monitoring location, coloured by
> the AQI we actually fetched. The diamond pins are water samples, coloured by
> their composite score.
>
> Note what *isn't* here: we don't draw any monitoring station we can't verify.
> Other saved locations get a neutral grey pin because we haven't fetched AQI for
> them — we show no value rather than a guessed one."

**Go to Historical Analytics.**

> "Mean, peak and range for AQI and PM2.5 over the selected period, computed over
> exactly the points plotted — and we show the hour count so you can see how much
> data each figure rests on.
>
> The water charts use markers rather than a smooth line, because samples are taken
> at irregular intervals. The connecting line is a visual aid; it doesn't imply we
> know anything about the gaps between samples."

---

### Minute 4:15 – 5:00 — Robustness and close

**Go to Settings.** Switch the theme; scroll to **Data sources**.

> "Theme, units, refresh interval, local data management — and full source
> transparency: every API we use, what it provides, and the caveats. All four
> sources are free and need no API key, so this runs with `npm install` and
> `npm run dev` and nothing else to configure."

**Optional, if time allows — show failure handling.** Turn off Wi-Fi, reload:

> "When a provider is unreachable we show the error, a retry, and a *separate*
> button for demonstration data. Synthetic data is never a silent fallback — it
> only appears because somebody asked for it, and when it does, you get that amber
> banner across the top."

**Close:**

> "181 automated tests, all passing. TypeScript strict mode, clean production
> build, no console errors. And the EPA arithmetic is verified against hand
> calculations rather than against our own output."

---

### If the network fails

The demo still works. Open the app, let the request fail, and click **Show
demonstration data**. Then say:

> "This is actually a good opportunity to show you the failure handling we built.
> Notice it didn't quietly substitute fake numbers — it told me the provider was
> unreachable and offered me the choice, and now that I've taken it, there's a
> banner making sure nobody mistakes this for live data."

The water module, charts, map pins for samples, settings and education all work
fully offline, because that data is local.

---

## Part 2 — Viva questions and answers

### A. Project scope and design decisions

**Q1. Why is water quality manually entered when air quality is live?**

Because the data genuinely isn't available. We searched for a public API reporting
real-time pH, turbidity, dissolved oxygen, TDS, conductivity and temperature for
arbitrary water bodies and found none with global coverage. The alternatives were
to fabricate values or to build a system for data a person actually measures. We
chose the second: the user records what they measured, and the application
validates, scores, charts, maps, persists and exports it. Every record is labelled
"manual user entry" so it can never be mistaken for telemetry.

**Q2. Why the US EPA AQI rather than India's CPCB index?**

Because consistency matters more than which standard you pick, and we needed one we
could implement precisely from published documentation. The EPA method is fully
specified in EPA 454/B-24-002, including breakpoints, truncation rules and the
maximum-of-sub-indices rule. The risk we were avoiding is mixing scales — taking a
number computed under one standard and a category label from another — which
produces a figure that means nothing. Supporting CPCB as a user-selectable standard
is in our future scope; it would need its own complete breakpoint table, not a
relabelling of this one.

**Q3. Why no backend?**

Every data source we need is a public, CORS-enabled, key-less API, so a server
would only proxy requests the browser can already make. The one thing a backend
would genuinely add is syncing records across devices, which needs authentication,
hosting and a database. For a single-user project, that's cost without benefit. The
payoff is that the project runs anywhere with `npm install` and `npm run dev`, with
no configuration at all.

**Q4. What's the hardest problem you solved?**

Timestamp handling. The API returns naive local wall-clock strings like
`2026-11-11T03:30` plus a UTC offset. If you parse that string directly, JavaScript
interprets it in the *browser's* timezone — so monitoring Delhi from a machine set
to London silently shifts everything by five and a half hours. We keep both
representations: the naive string for chart axis labels, so the axis shows the
location's own clock, and a true UTC instant recovered by subtracting the offset,
for the "updated 12 minutes ago" indicators. There's a dedicated test for it.

**Q5. How do you stop a user mistaking demonstration data for real data?**

Four layers. Every dataset carries a provenance record with an origin field.
Synthetic data is tagged `demo` at the point of generation, not at the point of
display. The UI renders that as an amber chip plus a full-width banner reading
"Showing demonstration data — not real measurements". And demo data is never a
silent fallback: when an API fails you get an error with a retry and a separate,
explicitly labelled button, so it only ever appears because someone chose it.

---

### B. Air quality and the AQI

**Q6. Walk me through computing an AQI from a PM2.5 concentration.**

Five steps.

1. PM2.5 is already in µg/m³, which is what the EPA table uses, so no conversion.
2. Truncate to one decimal place — the EPA method specifies truncation, not
   rounding.
3. Find the band. For the 2024 revised breakpoints, 35.5–55.4 µg/m³ maps to AQI
   101–150.
4. Apply `I = (I_hi − I_lo)/(BP_hi − BP_lo) × (C − BP_lo) + I_lo`.
5. Round to an integer.

So 40.0 µg/m³ gives `(150−101)/(55.4−35.5) × (40.0−35.5) + 101`, which is about
112 — Unhealthy for Sensitive Groups.

**Q7. Why is the overall AQI the maximum and not the average?**

Because the index exists to warn you about the worst thing in the air. Averaging
would let a high PM2.5 reading be masked by low ozone and low sulphur dioxide, and
exposure to one dangerous pollutant isn't made safer by the others being low. The
pollutant producing that maximum is called the dominant pollutant, and we display
it, because it tells you what's actually driving the number.

**Q8. Why convert units before the lookup?**

The EPA breakpoint tables for the gases are defined in ppm for ozone and carbon
monoxide, and ppb for nitrogen dioxide and sulphur dioxide. Our provider reports
everything in µg/m³. Looking up a µg/m³ value in a ppb table would be meaningless.
We convert with the ideal-gas molar volume at 25 °C and 1 atm:
`ppb = µg/m³ × 24.45 / M`, where M is the molar mass. For NO₂ that's 46.0055, so
100 µg/m³ becomes 53.1 ppb, truncated to 53 — exactly the top of the "Good" band.

**Q9. Is this data from a real monitoring station?**

No, and we say so on the page. Open-Meteo serves the CAMS atmospheric composition
model, interpolated to the coordinates you ask for. It's a modelled estimate, not a
reading from an instrument standing at that spot. Real air quality varies sharply
over a few hundred metres — beside a busy road versus inside a park. We flag that
under "Measurement confidence and freshness" rather than implying station-grade
precision.

**Q10. The EPA particulate breakpoints assume a 24-hour average, but you chart
hourly values. Isn't that wrong?**

It's an approximation, and we state it. A single hourly value compared against a
24-hour breakpoint isn't strictly what the standard describes. We show it because
the hourly series is what reveals the diurnal pattern — the traffic peaks and the
afternoon dip — and because that trend tells you more than any single number. It's
listed in our known limitations.

**Q11. What happens above AQI 500?**

The EPA scale tops out at 500. If a concentration exceeds the top of the table we
cap the sub-index at the table maximum and set a `capped` flag, which the sub-index
table displays as "scale capped". We don't extrapolate past the published
breakpoints, because there's no defined mapping there. Ozone above 0.200 ppm is the
same situation — the EPA switches to a 1-hour table at that point, which we haven't
implemented.

---

### C. Water quality

**Q12. How is the water quality score calculated?**

Each of the six parameters gets a 0–100 sub-score from a piecewise-linear curve
defined by anchor points encoding its acceptable range — a value inside the band
scores 100, and the score falls away as it moves outside. The composite is the
weighted sum: turbidity and dissolved oxygen at 22% each, pH and TDS at 18% each,
conductivity at 12%, temperature at 8%. The weights sum to exactly 1, which a test
asserts, so the result is guaranteed to be 0–100.

**Q13. Where did those weights come from?**

They're ours, and we say so. There's no single canonical water quality index —
different authorities weight parameters differently depending on what the water is
being assessed for. We weighted turbidity and dissolved oxygen highest because
they're the two most directly tied to contamination and to whether aquatic life can
survive; temperature lowest because it's contextual rather than a quality judgement
in itself. The acceptable ranges draw on the WHO drinking-water guidelines and the
Indian standard IS 10500, but the weighting scheme is this project's own, and the
interface publishes the whole table.

**Q14. If a sample scores 95, is the water safe to drink?**

No, and that's the most important caveat in the project. The six parameters are
physico-chemical. Water can score well on all six and still be dangerous, because
none of them detects faecal contamination — E. coli and coliforms are invisible,
odourless and don't meaningfully change pH, turbidity or conductivity. Nor do they
detect heavy metals like arsenic, lead or fluoride, which are common in groundwater
in many regions. Establishing potability needs bacteriological testing, heavy metal
analysis and residual disinfectant, assessed against the standard that applies
locally. That disclaimer is a single exported constant rendered everywhere a score
appears, so it can't drift out of sync between pages.

**Q15. So what is the score actually good for?**

Four things. Comparing water bodies — a river reach at 2.8 mg/L dissolved oxygen is
clearly more stressed than one at 7.1. Detecting change over time at the same site,
which is a real signal worth investigating. Screening — results outside the
acceptable ranges are a reason to order proper laboratory testing. And assessing
aquatic habitat, because dissolved oxygen and temperature directly determine
whether fish can survive.

**Q16. Why does very low TDS score below 100?**

Because water with almost no dissolved minerals — typical RO or distilled output —
is flat-tasting and demineralised. It isn't contaminated, so we only penalise it
mildly: our curve scores 0 mg/L at 85 and reaches 100 around 150 mg/L. The
per-parameter message explains it rather than leaving the user guessing why a clean
sample lost points.

---

### D. Implementation and engineering

**Q17. How is data persisted, and what happens if it's corrupted?**

Browser `localStorage`, under four namespaced, versioned keys. Every read goes
through a type guard: `readStorage(key, fallback, validate)`. If the key is
missing, the JSON is corrupt, or the parsed value fails validation — which is what
happens if an older version of the app wrote a different shape — the fallback is
returned. Every access is also wrapped in try/catch, because storage throws outright
in Safari private mode. There are tests for corrupt JSON, wrong-shape data and a
quota failure.

**Q18. How do you handle a slow or failing API?**

A shared HTTP helper gives every request a 15-second timeout via an
`AbortController`, combined with any caller signal so an unmounting component and a
slow network both abort cleanly. Errors are normalised into an `ApiError` carrying a
message safe to show the user — Open-Meteo returns its own `reason` field on a 4xx,
so we surface that rather than a bare status code. And there's a request-id guard:
if you switch locations quickly and an older request resolves after a newer one,
the stale response is discarded.

**Q19. Did testing find any real bugs?**

Yes, three. The clearest was in the water store: "load demonstration samples"
computed how many records it had added from *inside* a React state updater. That
worked intermittently, because React only evaluates an updater eagerly when the
update queue is empty — so the first call returned the right count and the second
returned zero. A test caught it, and we moved the computation out of the updater
and kept the updater pure. We also found a missing React key on a fragment, and
during browser testing we found the water tile said "your recorded data" even when
every record was a demonstration sample, which we fixed by deriving the label from
the actual mix.

**Q20. What's your testing strategy?**

Three levels. Pure unit tests over `src/lib`, which has no I/O at all — that's where
the EPA arithmetic and the water index live, and they need no mocks. Service tests
with a mocked `fetch` returning fixtures shaped exactly like the real endpoint, which
cover forecast-hour trimming and timestamp conversion. And component and integration
tests with React Testing Library, including the full water CRUD lifecycle through its
real provider and an app-level test that clicks every navigation item and asserts the
page renders.

The deliberate choice is in the assertions: wherever possible the expected values are
boundary values taken from the published EPA tables, so they're correct by definition
rather than a snapshot of our own output. 181 tests, all passing.

**Q21. How did you verify the AQI implementation is actually correct?**

Two ways. The unit tests assert every published breakpoint boundary — PM2.5 at 9.0
must give exactly 50, at 9.1 exactly 51, and so on through all six pollutants.
Then, in the browser against live data, we took the sub-index calculation table and
recomputed several rows by hand: PM2.5 at 141.6 µg/m³ gave 217, PM10 at 199.3 gave
123, ozone at 31 gave 14. They matched the application exactly. That's verification
against the standard, not against ourselves.

**Q22. Why TypeScript?**

Because this project has units everywhere — µg/m³, ppm, ppb, NTU, mg/L, µS/cm,
Celsius — and nullable readings. Strict mode with `noUnusedLocals` caught several
mistakes at compile time that would have been silent wrong numbers at runtime. The
`DataOrigin` union type is also what makes the provenance rule enforceable in code
rather than by convention.

**Q23. Why so few dependencies?**

Nine runtime packages. We wrote the CSV writer, the AQI engine and the water index
by hand rather than pulling them in, because each is short, each needs to be
explainable in a viva like this one, and each is more valuable as reviewable project
work than as a dependency. The CSV writer is about forty lines and handles RFC 4180
quoting plus a formula-injection guard.

**Q24. What's the formula-injection guard?**

If a CSV field starts with `=`, `+`, `-` or `@`, a spreadsheet will evaluate it as a
formula when the file is opened. Since our sample location and notes fields are free
text, we prefix those with an apostrophe so they're read as text. It's a small thing,
but it's the kind of detail that separates an export that works from one that's safe.

**Q25. How does the map avoid showing fake stations?**

It only draws points it can verify. Monitoring locations come from geocoded
coordinates returned by the geocoding API. Water samples appear only when the user
supplied coordinates themselves — if they didn't, the sample simply isn't on the map,
and the page says how many records that applies to. Saved locations other than the
active one get a neutral grey pin, because we've only fetched AQI for the active one
and we'd rather show no value than a guessed one.

**Q26. Is the application accessible?**

It was built for it: semantic landmarks, every input with a real label, errors linked
with `aria-describedby` and flagged with `aria-invalid`, status messages in live
regions, a visible focus ring on everything interactive, and `prefers-reduced-motion`
respected globally. Our tests query by role and label rather than by CSS class, which
means they'd fail if the accessible names regressed. What we haven't done is run an
automated audit like axe-core or Lighthouse — that's listed honestly in our
limitations.

**Q27. How does the production build perform?**

2,088 modules, builds in under three seconds, no warnings. The main chunk is 155 kB,
44 kB gzipped. We split React, Recharts and the icon set into separate vendor chunks
so a returning visitor keeps them cached, and the Leaflet map is lazy-loaded behind
`React.lazy` — it's the heaviest dependency and only one of seven pages needs it, so
the other six never download its 158 kB.

---

### E. Questions about the team's own work

**Q28. Which part are you most pleased with?**

The sub-index calculation table on the air quality page. Most dashboards show you a
number. This shows the concentration, the unit conversion, the truncation, the
averaging period and the resulting index, row by row — so the AQI stops being a black
box and becomes arithmetic you can check. Verifying it by hand against live data and
getting exact matches was the point at which we were confident the implementation was
right.

**Q29. What would you do differently?**

Build the provenance system first. We added `DataProvenance` partway through, and
retrofitting it meant revisiting components we'd already written. It turned out to be
the architectural spine of the whole project — the thing that makes the honesty
guarantees enforceable rather than aspirational — and it deserved to be in the data
model from the first commit.

**Q30. What did you learn?**

That the hardest question in a data project is often "should we show this at all?"
rather than "how do we show it?". The easy version of this assignment generates
water readings and puts them next to the real air data. It looks more complete and
it's less work. Deciding not to do that forced us to build something more useful —
a real record system — and to be precise about what every number on screen actually
is. That discipline shaped more of the final application than any technical choice
we made.
