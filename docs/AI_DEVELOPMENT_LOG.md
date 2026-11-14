# AI-Assisted Development Log

**Air and Water Quality Index and Environment Monitoring System**

This document records how AI assistance was used while building this project. It
is written for transparency: if a reviewer asks which parts were AI-assisted, this
is the honest answer.

---

## 1. Conversation link

> **[Student: paste your Claude conversation share link here]**
>
> ```
> https://claude.ai/share/____________________________________
> ```
>
> To get this link: open the conversation in Claude, click the share icon near the
> top of the conversation, and copy the generated public link. Replace the line
> above with it before submitting.

If your institution requires a transcript rather than a link, export the
conversation and add it as `docs/ai-conversation-transcript.pdf`, then reference it
here.

---

## 2. Tool used

| | |
| --- | --- |
| Assistant | Claude (Anthropic), via Claude Code |
| Mode | Agentic — the assistant read and wrote files in the project directory, ran shell commands, and drove a browser directly |
| Human role | Specified the project, reviewed output, owns the submission |

The significant point about the mode: this was not a question-and-answer session
where code was copied out of a chat window. The assistant created the files, ran
`npm install`, ran the test suite, ran the production build, opened the running
application in a browser, and iterated when things failed.

---

## 3. How the work actually proceeded

### Phase 1 — Environment inspection

Checked the working directory (empty), the Node and npm versions (Node 26,
npm 11), and that `zip` was available. Then made a live call to the Open-Meteo air
quality endpoint to confirm it was reachable and to see its real response shape
before writing any client code against it.

### Phase 2 — Scaffolding and dependency selection

Created the project structure and `package.json` by hand rather than running a
scaffold tool, so every dependency was a deliberate choice.

Two things were caught and fixed here rather than later:

- `npm install` reported eight vulnerabilities in the initial version pins, all in
  dev tooling and the router. These were resolved by upgrading to patched majors —
  Vite 7, Vitest 4, React Router 7 — bringing the audit to **0 vulnerabilities**.
- A stray character was introduced into `tailwind.config.js` during file creation,
  producing an invalid object key. This was caught by grepping the written file,
  repaired, and the config was then verified by actually importing it in Node.

### Phase 3 — Core logic first

The pure modules were written before any UI:

- `lib/aqi.ts` — EPA breakpoint tables, unit conversion, truncation, sub-index and
  overall AQI
- `lib/wqi.ts` — water scoring curves and the weighted composite
- `lib/csv.ts`, `lib/storage.ts`, `lib/guards.ts`, `lib/format.ts`

Before writing the service layer, live calls were made to all three Open-Meteo
endpoints and the real response shapes were inspected, so the clients were coded
against observed reality rather than assumed structure. This is what surfaced the
naive-local-timestamp issue described in the architecture document.

### Phase 4 — UI, in priority order

P0 requirements were completed before any P1 or P2 work: the overview dashboard,
air quality page, water CRUD module, charts and responsive layout came first; the
map, analytics, education and settings pages followed.

TypeScript was type-checked after each module was written, so errors were caught
within a few files of being introduced rather than accumulating.

### Phase 5 — Testing

181 tests were written across 11 files. The deliberate decision here, and the one
worth highlighting: **assertions use boundary values taken from the published EPA
breakpoint tables**, not snapshots of the implementation's output. PM2.5 at
9.0 µg/m³ must give exactly 50 because that is the published band edge. The water
composite scores asserted in the tests (97.5 for a clean tap sample, 47.3 for a
polluted river sample) were computed by hand from the weighting table first, then
asserted.

The test suite found real defects, which is the point of writing it:

| Defect | How it surfaced |
| --- | --- |
| Record counts read from inside a React state updater returned 0 intermittently — React only evaluates an updater eagerly when the queue is empty | `WaterContext` integration test failed on the second call |
| One CSV test asserted the wrong rating because the expected score had been estimated rather than calculated | Test failed; recomputing by hand showed the **code** was right and the **test** was wrong |

The second one is worth noting explicitly: when the test and the implementation
disagreed, the implementation turned out to be correct. The test was corrected and
the correct hand-computed value documented in a comment.

Several environment gaps also had to be solved to make the suite run at all:
Node 26 ships a disabled native `localStorage` global that shadows jsdom's, and
jsdom provides no `matchMedia`, no `ResizeObserver` (which Recharts constructs on
mount) and a `scrollTo` that throws. Polyfills for all four live in
`src/test/setup.ts`, each with a comment explaining why it exists.

### Phase 6 — Browser verification

The running application was driven directly in a browser against live API data —
not simulated, not assumed. Every page was loaded, the console was checked, the
full water CRUD flow was exercised, location search and switching were tested,
persistence was verified by reading `localStorage` after a reload, the CSV export
was intercepted and its contents inspected, the mobile layout was checked at
375 × 812, and both themes were exercised.

This phase found a defect the test suite had not: the water summary tile showed
"Your recorded data" even when every stored record was a demonstration sample.
Fixed by deriving the label from the actual mix of records, with four new tests
added for the new helper.

It also produced the strongest verification result in the project. The air quality
page's sub-index table was checked against hand calculations using live
concentrations:

| Pollutant | Live reading | Converted | App sub-index | Hand calculation |
| --- | --- | --- | --- | --- |
| PM2.5 | 141.6 µg/m³ | — | 217 | 217 ✓ |
| PM10 | 199.3 µg/m³ | 199 µg/m³ | 123 | 123 ✓ |
| O₃ | 31.0 µg/m³ | 0.015 ppm | 14 | 14 ✓ |
| CO | 593.0 µg/m³ | 0.5 ppm | 6 | 6 ✓ |
| SO₂ | 17.8 µg/m³ | 6 ppb | 9 | 9 ✓ |

### Phase 7 — Documentation and packaging

README, project report, architecture document, this log and the GitHub upload
guide were written from the project as actually built, using the real measured
figures — bundle sizes from the build output, test counts from the test runner,
browser results from the browser session.

---

## 4. What AI assistance was genuinely good at

- **Mechanical breadth.** Writing 44 source modules with consistent structure,
  naming and comment style, without the quality drifting across the codebase.
- **Standards implementation.** Getting the EPA method right in detail —
  truncation rather than rounding, per-pollutant precision, molar-mass conversion
  for each gas, maximum rather than average.
- **Defensive coding.** Null handling, abort signals, storage validation and error
  normalisation were applied consistently rather than remembered sporadically.
- **Test coverage.** Writing thorough tests for edge cases that are easy to skip:
  corrupt stored JSON, quota failures, out-of-order responses, missing pollutant
  fields, scale capping.
- **Closing the loop.** Running the build, running the tests, opening the browser
  and fixing what actually failed — rather than producing code and assuming it worked.

## 5. What still required human judgement

- **The central design decision.** Recognising that air and water are different
  data problems, and deciding to build a record system rather than fabricate water
  readings, was a judgement about honesty, not a technical optimisation.
- **Scope.** Deciding that a backend was not worth its cost for this project.
- **Which standard to adopt**, and committing to using only that one.
- **The weighting scheme** for the water index, and the decision to publish it in
  the interface rather than bury it.
- **What to claim.** Every limitation in the README and report is there because
  someone decided it should be stated rather than omitted.

---

## 6. Verified claims

Everything asserted in this project's documentation was produced by running the
command or action stated. Specifically:

| Claim | Verified by |
| --- | --- |
| 0 npm vulnerabilities | `npm audit` after the dependency upgrade |
| TypeScript compiles clean in strict mode | `tsc -b` |
| 181 tests pass | `npm run test` |
| Production build succeeds with no warnings | `npm run build` |
| Bundle sizes | Vite build output |
| Zero browser console errors | Browser console read across all seven pages |
| EPA sub-index correctness | Hand calculation against live data, table above |
| Water sub-scores correctness | Hand calculation against stored samples |
| Persistence works | `localStorage` read after a full page reload |
| CSV export correctness | Export intercepted and contents inspected |

No test result, screenshot or measurement in this project's documentation is
estimated or assumed. The screenshots in `docs/screenshots/` are captures of the
running application with live API data.

---

## 7. Note for the student

If you are asked about AI use in a viva, the useful answer is a specific one. The
assistant wrote the code, ran the tests and drove the browser; the project's design
decisions — one index standard, manual water records rather than fabricated ones,
publishing the weighting scheme, stating the limitations — are the parts worth
being able to defend, and the [`DEMO_GUIDE.md`](DEMO_GUIDE.md) viva section covers
each of them with the reasoning behind it.

Read `lib/aqi.ts` and `lib/wqi.ts` before your viva. They are the heart of the
project, they are heavily commented, and the questions most likely to be asked are
about what is in those two files.
