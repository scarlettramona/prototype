# Phase 1 · Data and foundation

Read `docs/prototype-overview.md` first.

## Goal

Build everything the screens will stand on. **No feature screens in this phase.**

**Start in plan mode.** Do step 1, report back, then present a plan for steps 2–6 for approval before writing code.

## 1. Learn the template (report before coding)

Report:
- Angular version; standalone or NgModules; signals, RxJS or both
- Angular Material version (M2/M3) and how it's themed
- **Where the Pluto design tokens live** and how they're named, especially colour roles (surfaces, on-surface, outline, primary). The designs use Pluto's semantic colours in **dark** mode.
- Routing setup, and where feature routes belong
- What the shell already provides (header, nav, layout)
- Lint, test, build and serve commands; folder and naming conventions

Then **create or update `CLAUDE.md`** with those conventions and these standing rules:
- Pluto tokens for every colour, spacing and type value; no hard-coded hex values in components
- Angular Material / Pluto components before custom ones
- Charts only through `ngx-echarts` and the shared theme
- Prototype only: no backend, no auth, no persistence beyond memory
- Don't restructure the template shell; add to it
- Read `docs/prototype-overview.md` before each phase; update its **What already exists** section at the end

If anything is missing or ambiguous (for example no tokens suit charts), **stop and ask**.

## 2. ECharts

- Install `echarts` and `ngx-echarts` (compatible with the template's Angular). Use tree-shaken imports for line, scatter, dataZoom (slider + inside), brush, markArea, markLine, tooltip, grid.
- Register a `pluto-dark` theme **from the Pluto tokens**: transparent background; axis lines, ticks and gridlines from outline tokens (gridlines very low contrast); labels from on-surface-variant; tooltip on the lowest surface with an outline border.
- Create **one shared module** exporting the series palette, dash patterns, amber, furniture colour and the QI → symbol map from the overview. Later phases import from it.

## 3. Data

Copy the provided `piwa-mock-data/` folder into the app's static assets (e.g. `src/assets/mock-data/`):

```
vnv/AN102-WSTA-TI-0xx.csv   originals, as exported
vnv/vnv-readings.csv        sensor,date,value,units,vv_qi
vnv/vnv-metadata.csv        Structure,Retrieval Date,Start Date,End Date
ill/A103-R19-N100369_07-21-2026-1016.csv  original scan
ill/ill-scans.csv           scan,scan_datetime,corrected_depth_in,corrected_counts
ill/ill-scan-metadata.csv   scan,scan_datetime,vv_qi
```

Things the code must handle:
- VNV values are °F (~75.9–80.8), quantised in ~0.18 steps and stored as floats (`77.90000153`). Display with 2 decimals.
- VNV dates have **no times**, and some dates have up to 7 readings. Spread same-day readings evenly across the day, keeping file order.
- All 212 source readings are `Unreviewed`. TI-074's export lacked the QI column, so it's filled with `Unreviewed`.
- The ILL scan runs 513 points, depth 591.42 → 13.32 in (descending), counts 3.5–1853. Shape: ~800–1050 counts above ~490 in; a sharp drop around 476–468 in; near zero until ~146 in; a sharp rise around 137–133 in to ~1650–1850; then a noisy plateau. Spacing is ~0.2 in at the transitions and ~1.2–3 in elsewhere.

**Domain types** (derive exact shapes from the data and template conventions):
`Qi`, `Sensor` (id, structure, elevation default `0 in`, units, colour index), `Reading` (sensorId, timestamp, value, qi, comment?, reviewer?, reviewedAt?), `Scan` (id, datetime, colour index, scan-level qi, analysis), `ScanPoint` (depthIn, counts), `Analysis` (`saved?` / `unsaved?` result sets plus the parameters used), and VNV reference data: baseline (sensor, value, upper/lower limit offsets, slope rate per year, start date) and equipment out of service (sensor, start, end).

**Seeded generator** (same seed → same output; augments, never alters real rows):
- **VNV:** up to **40 sensors** named `AN102-WSTA-TI-0xx`, each derived from one of the 5 real series (offset ±1–3 °F, its own noise, same quantisation). Covers **01/01/2025 → 11/12/2026** with 1–4 readings a day and a mild seasonal swing. QI mix: older data mostly Good, some Suspect, occasional Transcribed, each with a reviewer, review date and short comment; the last ~2 weeks Unreviewed. At least one equipment-out-of-service window, plus baseline settings.
- **ILL:** **8 scans** of the same riser, derived from the real profile (small count offsets, the drop and rise shifted ±1–2 in, fresh noise, different dates). Spread analysis states across them: saved; saved + unsaved re-run; none; first run unsaved. Calculated ILL should sit near the rise (~134–136 in).
- Keep all settings in one config object.

## 4. Mock services

One per module, following template conventions. Reads return after 300–800 ms. Mutations work in memory: apply QI/comment to readings; run analysis (creates unsaved results); save analysis; discard unsaved.

## 5. State switcher

A `?state=<name>` query parameter plus a dev-only menu. Each state is a **fixture**: module, what's loaded, view, selections, open popovers, analysis states. Define the fixtures and the loader now; screens consume them later.

- **VNV:** `vnv-first-visit`, `vnv-chart`, `vnv-chart-load-form-open`, `vnv-chart-sensors-hidden`, `vnv-chart-selection`, `vnv-table`, `vnv-table-selection`
- **ILL:** `ill-library-empty`, `ill-library-results`, `ill-all-scans`, `ill-scan-saved`, `ill-scan-unsaved-rerun`, `ill-scan-no-analysis`, `ill-scan-first-run-unsaved`, `ill-scans-popover`

## 6. Proof page

A temporary route (e.g. `/dev/data`) inside the shell showing, with the theme and generated data:
1. a VNV time series of a few sensors, with QI symbols and a dataZoom slider
2. an ILL depth profile of all 8 scans, with x reversed (600 → 0) and y as Corrected Counts

Don't polish it.

## Acceptance

- [ ] Template report delivered; `CLAUDE.md` written
- [ ] Builds and serves cleanly (`npm run verify`; there is no linter)
- [ ] Theme registered from tokens; palette, dashes, amber and QI symbols exported from one module
- [ ] CSVs parse; the real 212 readings and 513 points appear unchanged in the generated data
- [ ] Generator is deterministic (unit test) and produces 40 sensors and 8 scans with the analysis-state spread
- [ ] Services add latency; mutations persist in memory
- [ ] Every `?state=` fixture loads without errors
- [ ] `/dev/data` renders both charts correctly. Take a screenshot to confirm.
- [ ] **What already exists** updated in the overview

## Out of scope

All feature screens and components.
