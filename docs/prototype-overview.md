# PIWA prototype · Shared overview

**Every session reads this file and `CLAUDE.md` first, then its own phase brief.** Keep this file short and true. At the end of each phase, update **What already exists** (bottom of this file).

## What we're building

A **clickable, non-functional prototype** of two redesigned PIWA modules, built inside our existing Angular template app (a UI shell). It must look and behave as if it works — realistic data, working view switches, filters, selections, popovers and loading states — with **no backend**. All data is mock data held in memory. Charts use **Apache ECharts** via `ngx-echarts`.

- **VNV (Verification and Validation):** reviewers load temperature sensors for a date range, view the readings as a chart or a table, and assign a quality indicator (QI) and comment to individual readings.
- **ILL (Interstitial Liquid Level):** engineers find scans in a **Scan library**, open several scans of one riser in a **focus view** (one tab per scan plus All scans), compare depth profiles, run an analysis with editable parameters, and save or discard the results.

Design source: Figma file **`Eb0lHuZv2e067FftD2RuqL`** ("Prototype"), with the pages **ILL - scan library**, **ILL - focus-view** and **VNV**. Frame link format:
`https://www.figma.com/design/Eb0lHuZv2e067FftD2RuqL/Prototype?node-id=<id with - instead of :>`

> **Figma wins.** Where these docs and the Figma frames disagree, follow Figma. Use these docs only for behaviour the frames don't show. The phase briefs were written against an older file (`WGtQ4moB8D0OgkhUh8npq2`, `757:xxxx` node IDs) and **must not be used**. Translate their node IDs with the table below.

| Brief node | Use node | Frame |
|---|---|---|
| `757:13387` | `1:10892` | VNV table view, values selected, docked VNV panel |
| `757:13484` | `1:10989` | VNV first visit (load form is the page) |
| `757:13636` | `1:11102` | VNV chart view, load form popover open |
| `757:14035` | `1:11401` | VNV chart view, loaded |
| `757:19990`, `757:20015` | `1:11678` | VNV popover and selection bar (`VNV ⋯`) |
| `757:14303` | `1:1990` | `content-switcher` component set |
| `757:14314` | `1:2001` | `filter-toggle` component set |
| `757:20032`, `757:20218`, `757:20410`, `757:20603`, `757:20801` | `1:11708`, `1:11792`, `1:11882`, `1:11972`, `1:12068` | Sensor picker (`sensor-query`) states |
| — | `1:6630`, `1:6651` | `miller-parent` / `miller-item` component sets (tree and sensor rows) |
| — | `1:11633` | VNV legend |
| `757:14857` | `1:2014` | ILL Scan library, no scans loaded |
| `757:14937` | `1:2094` | Scan library results, one row expanded |
| `757:15176`, `757:15233`, `757:15308` | `1:2334`, `1:2883`, `1:3814` | Library: grouped by well with selection; Saved filter with saved/unsaved values; grouped with a row expanded |
| `757:17887` | `1:8968` | Focus view, scan tab, zoomed in |
| `757:18428` | `1:9514` | Focus view, scan tab, full range |
| `757:18962` | `1:10048` | Focus view, All scans |
| `757:19883` | `1:10714` | Scans legend popover |
| — | `1:9509` | `switch` component set (Fit Y) |

Each phase brief lists only its own frames.

## Glossary

| Term | Meaning |
|---|---|
| Sensor | A VNV temperature sensor, e.g. `AN102-WSTA-TI-054`, shown with elevation: `AN102-WSTA-TI-054 (0in)` |
| Reading | One VNV value: sensor, timestamp, °F value, QI, optional comment and reviewer |
| QI | Quality indicator: **Good, Suspect, Unreviewed, Transcribed** |
| Scan | One ILL neutron scan of a riser, e.g. `A 103 R 19 N 100369` at `07-21-2026 10:16 AM`: corrected counts by depth |
| Analysis | ILL results (Calculated ILL, Depth correction, Std deviation, In tolerance, Outliers, Raw markers) from a set of parameters. Can be **saved**, **unsaved**, both, or absent |
| Focus view | The ILL screen with scan tabs, chart, Scan details and Analysis parameters |

## Decisions that apply everywhere

**Copy and data**
- Use the text in the Figma frames **exactly**. Never add helper text, empty-state messages or explanations that aren't in the designs. If something seems to need copy that doesn't exist, ask.
- Values in the frames are placeholders. Labels come from Figma; **values come from the mock data.**

**Data**
- **VNV QI is per reading. ILL QI is per scan** (one per dataset; depth points carry none).
- Real sample data lives in the app's assets under `mock-data/` (VNV: 5 sensors, 212 readings; ILL: 1 scan, 513 points). A seeded generator scales it up. **Real rows are never altered.**

**Colour and charts**
- Pluto design tokens for every colour, spacing and type value. No hard-coded hex values in components, except the chart palette module.
- Series palette (sensors and scans): `#4C8DF6, #4CD07D, #9B7BEA, #F2555A, #2FC4D4, #D96BE0, #8DB8FF, #A6D96A, #F08CB4, #4FB8A0`. Beyond 10 series, cycle with dashes: solid, `[7,3]`, `[2,2]`, `[8,3,2,3]` (supports 40).
- **No amber** (decided 2026-11-15, Figma wins): unsaved / changed values use **primary**, and edited fields get a neutral dot. `AMBER` stays in the palette module but is unused.
- QI → ECharts symbol: Good `circle`, Suspect `triangle`, Unreviewed `rect`, Transcribed `diamond`.
- Chart furniture (baseline bands, out-of-service bands): `#8FA3C8` at low opacity.

**Chart interaction (both modules)**
- **Navigator:** a `dataZoom` slider under the chart shows the full loaded range. Its window is the current view; while a handle is dragged, it shows the handle's value in a small label above it.
- **Reset** sits to the left of the navigator (no − / + in Figma). Reset is disabled at full range.
- **Fit Y** is on by default: the y-axis fits the visible data, using the 1st–99th percentile plus padding so single spikes don't flatten the rest. Off locks the full scale. Animate rescales.
- Hover shows a crosshair and a readout of **every visible series** at that x.
- Drag on the chart pans; Ctrl/⌘ + wheel zooms at the cursor; plain wheel scrolls the page.
- Hidden series disappear from the chart and the readout.

**VNV specifics**
- The quality filter applies to **both** the chart and the table.
- Chart and table are one dataset in two views, switched by the **Table view / Chart view** switcher. Selections carry across.
- Selecting readings (brush on the chart, checkboxes in the table) leads to the VNV form: Quality indicator and VNV comment, then Cancel / Apply. Apply updates the readings in memory.

**ILL specifics**
- A focus view holds one tab per open scan plus **All scans**. The zoom range is **shared across all tabs**, All scans included. Reset applies everywhere. A fresh visit starts at the full profile.
- In a scan tab, every scan stays on the chart. The focused scan is drawn slightly heavier and on top; the others are thinner and slightly faded. The focused scan can't be hidden.
- Unsaved work shows a **dot** on the tab (in place of its close ×). Changed parameter fields get a neutral dot marker with the saved value beneath (Figma 1:8968).
- **Run analysis is the primary button until results exist; after that, Save analysis is primary.**
- Saved vs unsaved results show as **two value columns** in Scan details: saved, then unsaved in primary, with no headers and no Δ (Figma). In the scans legend, Saved is solid and Unsaved dashed in the scan's colour (Figma 1:10714).
- The depth axis is **reversed: 600 in on the left, 0 on the right**. The y-axis is Corrected Counts.

**Prototype mechanics**
- `?state=<name>` jumps to any named screen state; a dev-only menu lists them.
- Mock services add 300–800 ms latency. Mutations live in memory until reload.

## Handoff rule

Before finishing a phase:
1. Update **What already exists** below: what you built, file paths, public inputs/outputs, and any decision you had to make.
2. Update `CLAUDE.md` if you added a convention.
3. Make sure the app builds and lints.

## What already exists

Paths are relative to `projects/template-application/src/app/` unless they start with `projects/`.

### Phase 1 · Foundation

**Decisions**
- **Figma wins** over these docs; use file `Eb0lHuZv2e067FftD2RuqL` (node map at the top). Confirmed with Scarlett, 2026-11-15.
- **Dark surfaces** are plain neutral tones to match Figma (`styles/base/material-system-overrides/_palette-overrides.scss`); the template had tinted them with primary.
- **Spacing:** use the template's `--spacing-NNN`, matched to Figma by pixel value (see `CLAUDE.md`).
- **Header** gained the PIWA name and ILL / VNV / Baseline tabs (`layout/header/`). Baseline isn't built, so it's shown but not a link. The user text is Figma's `Welcome, User, User`.
- **No linter** exists in the template, so phases check `npm run verify` (tests + build) only.
- **Mock data is broader than the brief said:** the Scan library frames show many wells, so ILL has 11 wells (see below), not one riser.
- **Chart theme** is passed to charts as an object (`[theme]="chartTheme.theme()"`), not registered by name: ECharts draws on canvas and can't use `var()`, so the theme is rebuilt from the resolved token colours whenever the app theme toggles.

**Routes** (`app.routes.ts`, segments in `core/routing/app-paths.ts`)
| Route | Component | State |
|---|---|---|
| `/` | redirects to `/vnv` | |
| `/vnv` | `feature/vnv/vnv-page/` `VnvPageComponent` | empty stub for Phase 3 |
| `/ill` | `feature/ill/scan-library-page/` `ScanLibraryPageComponent` | empty stub for Phase 6 |
| `/ill/focus/:wellId` | `feature/ill/focus-page/` `FocusPageComponent` | empty stub for Phase 7 |
| `/dev/data` | `feature/dev/data-proof/` | dev builds only (`canMatch: isDevMode`). Proof charts; delete when no longer useful |

**Charts** (`core/charts/`)
- `echarts.ts`: registered parts. Brush and markArea were added in Phase 1; dataZoom covers the slider and inside zoom.
- `chart-palette.ts`: the only place with hex values.
  - `SERIES_COLORS`, `DASH_PATTERNS`, `MAX_SERIES` (40), and `seriesStyle(i)` → `{ color, dash }` (dashes start after 10 series).
  - `AMBER`, `FURNITURE` + `FURNITURE_OPACITY`, `QI_SYMBOL`, and `hexAlpha()`.
- `pluto-chart-theme.ts`: `PlutoChartThemeService.theme()` is the current theme object.
  - Transparent background.
  - Axis lines and grid from `outline-variant`; labels from `on-surface-variant`.
  - Tooltip on `surface-container-lowest` with an `outline` border.
  - dataZoom and brush in primary.

**Domain types**
- `core/qi/qi.models.ts`: `Qi`, `QI_VALUES`.
- `core/vnv/vnv.models.ts`:
  - `VnvFarm` → `VnvGroup` → `VnvLocation` (the header's "component") → `Sensor`.
  - `Reading` (id `<sensorId>|<timestamp>`), `Baseline`, `OutOfService`.
  - `VnvLoadRequest`/`VnvLoadResult`, `VnvReviewRequest`.
- `core/ill/ill.models.ts`:
  - `Well`, `Scan` (id `<wellId>|<timestamp>`, `qi: 'Good' | 'Suspect' | null`, `scanComment`, `vnvComment`), `ScanPoint`, `ScanSummary` (a scan without points).
  - `Analysis { saved?, unsaved?, analyst? }`, `AnalysisParameters` (preset, calculationBaseline, miscellaneous, illMethod, markerMethod), `AnalysisResults`.
  - `analysisState()` → `none | saved | unsaved | saved+unsaved`.
  - `ScanQuery` (the Load scans form), `ScanReviewRequest`.

**Mock data** (`core/mock-data/`; CSVs in `projects/template-application/public/mock-data/`)
- All settings live in `mock-data.config.ts` (`MOCK_DATA_CONFIG`): seed, latency, current user (`Scarlett Reagan`), and placeholder people and comments from Figma.
- **VNV** (`core/vnv/vnv-source.ts`, `vnv-generator.ts`):
  - **Farm AN** has three groups:
    - **241-AN-WSTA:** `241-AN-WSTA-102-TI`, with 40 sensors: the 5 real ones plus `AN102-WSTA-TI-041…`.
    - **241-AN-TMAC:** 101–105, 6 sensors each (`AN10x-TMAC-TI-U{1-3}-RJ{A,B}`).
    - **241-AN-WST:** 101 and 104, 6 sensors each.
  - About 20% of the TMAC/WST sensors have no data after 03/31/2025, for the picker's no-data state.
  - **Readings:**
    - Coverage runs 01/01/2025 → 11/12/2026 with 1–4 readings a day, quantised to 0.1 °C at float32 like the exports.
    - Each reading is reviewed with a QI mix, reviewer and comment, except the last 14 days, which stay Unreviewed.
    - Readings are generated per sensor on first request.
  - The real 212 rows are untouched.
  - Every sensor has a baseline, and there are 3 out-of-service windows.
- **ILL** (`core/ill/ill-source.ts`, `ill-generator.ts`, `ill-analysis.ts`, `ill-query.ts`):
  - **Wells:**
    - The real scan's well, `A 103 R 19 N 100369`, holds the real scan (513 points, untouched) plus 2 generated scans.
    - The focus well, `B105 R05 N 20571`, has 8 scans in the states `saved, saved+unsaved, none, unsaved, saved, saved, saved+unsaved, saved`.
    - 9 more wells from the library frames have 2–6 scans each.
  - About half of the scan dates fall in the library's default range, 07/19–10/19/2026.
  - `analyse()` is a mock analysis that puts the calculated ILL at the rise (~134–136 in) and responds to parameter edits.
  - Unsaved re-runs change `illMethod.normalLowerRange` from 10.5 to 12, as in the Figma frame.
- `MockDataService` fetches the CSVs once and builds the datasets. Only the mock services use it.

**Mock services** (Promise-based, 300–800 ms, the `MOCK_LATENCY` token)
- `VnvMockService` (`core/vnv/vnv-mock.service.ts`):
  - `getFarm()`, `getSensors(ids)`, `sensorsWithData(ids, start, end)`
  - `load({ sensorIds, start, end })`
  - `applyReview({ readingIds, qi, comment })`, which records the current user
- `IllMockService` (`core/ill/ill-mock.service.ts`):
  - `getWells()`, `searchScans(query)` (newest first, no points), `getScans(ids)`, `getWellScans(wellId)`, `getPresets()`
  - `runAnalysis(scanId, params)`, `saveAnalysis(scanId)`, `discardAnalysis(scanId)`
  - `reviewScans({ scanIds, qi, scanComment?, vnvComment? })`
- Mutations stay in memory until reload.

**State switcher** (`core/prototype-state/`)
- `prototype-states.ts` defines `PROTOTYPE_STATES`: 20 fixtures, which are the brief's states plus `vnv-load-form-search`, `ill-library-grouped`, `ill-library-saved`, `ill-library-grouped-expanded` and `ill-scan-zoomed`. Each fixture notes the Figma frame it reproduces.
- `resolve-prototype-state.ts` turns a fixture into concrete ids: loaded sensors, selected reading ids, library query and selection, expanded scan, focus-well scan ids, the active tab (picked by analysis state), and the zoom.
- `PrototypeStateService` (started in `app.config.ts`) watches `?state=`, resolves it, and moves to the fixture's route. **Screens read `state()`**: `ResolvedVnvState | ResolvedIllLibraryState | ResolvedIllFocusState | null`, where `null` means start fresh.
- `ui/patterns/state-menu/` is the dev-only header menu that lists every state.

**Testing**
- Specs read the CSVs from disk through `core/mock-data/testing/`.
- `provideTestMockData()` provides the datasets with zero latency.
- `testing/` folders are excluded from the app build.

### Phase 2 · Shared components

**Decisions** (confirmed with Scarlett, 2026-11-15; Figma wins over the Phase 2 brief)
- **VNV legend rows** have no checkbox and no elevation; **clicking a row toggles the sensor** and hidden rows dim. The ILL scans legend uses checkboxes.
- **No amber** anywhere (see "Colour and charts"). The detail row's compare column is primary.
- **Graph menu (⋯)** on the selection action bar is shown but **inert** (`aria-disabled`) until a frame defines its contents.
- The **selection action bar** is `VNV | ⋯` only; "N values selected" lives in the VNV form header.
- The **chart card navigator** has **Reset only**, on its left.
- The **date range field** is text + ▾ (no calendar icon). Its popover has no frame, so it reuses the Load sensors form's Start date / End date fields.
- The **quality filter** is plain toggle buttons, not `mat-chip-listbox`: Material's multi-select chips always draw a checkmark, which the design doesn't have.
- **Buttons** use `corner-extra-small` (2 px) to match Figma (`styles/components/material-component-overrides/_mat-button.scss`).
- **Dates** use `provideNativeDateAdapter` with MM/DD/YYYY display (`app.config.ts`).

**Global styles** (`styles/components/`)
- `_popover.scss`: `.app-popover`, the popover surface (`surface-container-high`, `outline-variant` border, `corner-medium`, 16/24 padding, 24 gap); `.app-popover-backdrop`, a transparent backdrop.
- `_dividers.scss`: `.app-divider-vertical`, a 1 px rule that stretches to its row.

**Components** (all in `ui/components/<name>/` unless noted; standalone, OnPush, signal inputs)
| Selector | Inputs / models | Outputs | Notes |
|---|---|---|---|
| `app-qi-icon` | `qi: Qi`, `size = 16` | | ● ▲ ■ ◆ in currentColor |
| `app-series-swatch` | `color`, `dash: 'solid' \| number[]`, `marker: 'ring' \| 'none'` | | ring 25×13 (VNV), plain 22×12 (ILL). Ring fill is `--swatch-ring-fill` (defaults to surface-container) |
| `app-detail-row` | `label`, `value` (formatted string), `compareValue?`, `unit` | | grid; widths from `--detail-value-width` (80px) and `--detail-unit-width` (24px) |
| `app-panel-section` | `title`, `titleStyle: 'heading' \| 'label'`, `actionLabel` | `action` | divider above every section but the first |
| `app-side-panel` | | | surface-container, 24 padding and gap, scrolls |
| `app-view-switcher` | `value` (model `'table' \| 'chart'`); `ContentView` type | | `mat-button-toggle-group`. Toggles report `aria-checked` |
| `app-quality-filter` | `value` (model `Qi[]`, the shown QIs, kept in QI order) | | toggle buttons with `aria-pressed` |
| `app-legend-row` | `label`, `swatch?` (`LegendSwatch`), `mode: 'toggle' \| 'checkbox'`, `visible` (model), `locked`, `indeterminate`, `emphasis`, `indent`, `labelTone` | | toggle = VNV; checkbox = ILL scans legend (All scans / focused / Saved / Unsaved rows) |
| `app-swatch-select` | `options: SwatchOption[]`, `value` (model), `ariaLabel` | | outlined `mat-select`, 44 px |
| `app-page-header` | `title` | | layout; project content, with `[pageHeaderEnd]` for the right end |
| `app-vnv-page-header` · `feature/vnv/components/vnv-page-header/` | `loaded: { name, sensorCount } \| null`, `range` (model), `showAllData` (model), `view` (model) | `loadData` (button element, for anchoring), `rangeApplied` | `null` = first visit (title only) |
| `app-date-range-field` | `range` (model `DateRangeValue { start, end }`, local-midnight ms), `ariaLabel` | `applied` | CDK overlay popover; Apply disabled when end < start; Escape closes; focus returns to the trigger |
| `app-chart-card` | `showNavigator`, `resetDisabled` | `reset` | slots `[chartToolbar]`, default (chart), `[chartNavigator]` |
| `app-selection-action-bar` | | `vnv` (button element) | ⋯ inert |
| `app-vnv-form` | `count`, `noun: 'values' \| 'scans'`, `layout: 'popover' \| 'docked'`, `initial?` | `apply({ qi: 'Good' \| 'Suspect', comment })`, `cancel`, `close` | popover layout applies `.app-popover` itself. Apply is disabled until a QI is chosen. The comment is trimmed |

**Dev pages:** `/dev/gallery` (`feature/dev/component-gallery/`) shows every component in its states, with an Events line that logs outputs.

**Tests:** `ui/components/shared-components.spec.ts`.
