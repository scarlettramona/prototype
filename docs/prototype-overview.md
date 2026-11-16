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

### Phase 3 · VNV chart view

**Decisions** (Scarlett, 2026-11-15)
- **Navigator + Reset added** to the VNV chart, though the VNV frame lacks them (ILL pattern).
- **Fit Y switch added** to the VNV toolbar ("Fit Y" + switch, on by default).
- **Show all data is visual only:** it keeps its state but doesn't change the data until its behaviour is defined.
- **Export opens a menu: "Chart image (PNG)" / "Data (CSV)"**, both real downloads. **Wording is mine; to be confirmed.**
- **Right panel follows Figma's order:** Legend, then Baseline sensor, then Equipment out of service. The whole panel scrolls with 40 sensors.
- **Baseline and out of service** are drawn for the sensor selected in each panel select. The baseline is a solid `FURNITURE` line in a faint `FURNITURE` limit band; out of service is a shaded `markArea`.
- **Markers** draw when *visible sensors × window days* ≤ **2,400** (`MARKER_SENSOR_DAYS`); wider views show lines only. That keeps 40 sensors readable at 60 days while the usual 1–12 get markers over much wider windows: 12 → 200 days, 6 → 400 days, 1 → always.

**Route and pieces**
- `/vnv` → `feature/vnv/vnv-page/` (`VnvPageComponent`). It provides `VnvStore` and reacts to `PrototypeStateService.state()`: a VNV state is applied, and `null` means first visit (title only).
- `feature/vnv/vnv-store.ts` (`VnvStore`, page-scoped):
  - **Signals:** `location`, `range`, `showAllData`, `view`, `result`, `loading`, `hiddenSensorIds`, `visibleQi`, `baselineSensorId`, `oosSensorId`, `window` (`null` = full), `fitY`, `loadFormOpen`.
  - **Computed:** `headerSummary`, `xRange`, `effectiveWindow`, `atFullRange`, `series` (grouped by sensor), `baseline`, `outOfService`.
  - **Methods:** `load(locationId, range)`, `reloadRange(range)`, `applyState(ResolvedVnvState)`, `clear()`, `toggleSensor(id)`, `setWindow()` (clamped), `resetWindow()`.
- `feature/vnv/components/vnv-chart/`:
  - `VnvChartComponent` (`app-vnv-chart`) is the chart card: quality filter, Fit Y, divider, the Export menu, the chart, and the navigator with Reset.
  - `vnv-chart-options.ts` holds the pure builders: `buildVnvChartOptions`, `windowOption`, `yRangeFor` (1st–99th percentile + 8%), `baselineAt`, `readoutFormatter`, `nearest`, `toCsv`, `groupBySensor`, `showMarkers`.
- `feature/vnv/components/vnv-reference-panel/` (`app-vnv-reference-panel`): the Legend (toggle rows), Baseline sensor (swatch select + detail rows) and Equipment out of service.
- `ui/components/chart-navigator/` (`app-chart-navigator`, shared; ILL uses it in Phase 7):
  - **Inputs:** `series: NavigatorSeries[]`, `xMin`, `xMax`, `inverse`, `window` (model, `null` = full), `labelFormatter`.
  - **Rendering:** a preview on x-axis 0, with the slider on a hidden x-axis 1 so the preview never zooms.
  - **Drag label:** a primary bubble above the dragged handle.
- `PlutoChartThemeService.tokens()` now exposes the resolved token colours, including `surfaceContainer`, for loading masks and export backgrounds.
- The Load data popover is an empty 806 px `.app-popover` anchored under the button (Phase 5 fills it). `?state=vnv-chart-load-form-open` finds the button after render.
- `view === 'table'` leaves an empty area for Phase 4.

**Chart performance rules** (68k readings, 40 sensors)
- **Window changes merge:** the full option rebuilds only when the data or the marker flag changes. Window and y-range changes go through `[merge]` (`windowOption`). Read the window `untracked` inside the options computed, and do the same in the navigator.
- **Plain points:** series use `[t, v]` data with a `symbol` callback, not an object per point. Objects were roughly 4× slower.
- **Window-only processing:** the inside dataZoom uses `filterMode: 'filter'`, so only the window's points are processed.
- **No entry animation:** `animationDuration: 0` stops rebuilds from sweeping in; `animationDurationUpdate: 300` keeps rescales animated.
- **One update per frame:** chart zoom events are coalesced to one store update per animation frame.
- **Measured** in the dev build, 40 sensors: a pan is 150–230 ms per frame, a rebuild ~340 ms, and the full range ~300 ms.

**Tests:** `vnv-chart-options.spec.ts`, `vnv-store.spec.ts`.

### Phase 4 · VNV table view and assigning QI

**Decisions** (Scarlett, 2026-11-15, or Figma-wins)
- **Chart selection is Shift + drag** (ECharts brush, rectangle). Plain drag still pans.
- **The quality filter chips are in the table toolbar too.** It's one shared filter, and it also hides table rows.
- **Group by sensor** follows the Scan library's grouped pattern: a group row with chevron, checkbox, sensor name and "N values". The button switches to **"Ungroup sensors"**. **That wording is mine; to be confirmed.**
- **Table columns follow Figma:** checkbox · Sensor · Value (right-aligned, 2 decimals) · Quality (text) · Date · Comment (one line) · Reviewer. Empty cells show `--`, as in the frame.
- There's **no search field** (none in the frame). Rows are **virtual-scrolled**, 48 px each. The default sort is newest date first; every header sorts, and the active one shows an arrow.
- **Table Export** downloads a CSV of the visible rows straight away.
- **Right panel in Table view:** with a selection, the docked VNV form (340 px) replaces the reference panel; otherwise the reference panel stays.
- **Cancel and × clear the selection.** Apply records `Scarlett Reagan` as reviewer and clears the selection.
- **The VNV form pre-fills the QI** when every selected reading shares Good or Suspect.
- **Fixtures with a selection** open with the chart zoomed to about 3 weeks around it.

**Store additions** (`vnv-store.ts`)
- **Signals:** `selectedIds`, `vnvPopoverOpen`, `applying`, `tableSort`, `grouped`, `collapsedGroups`.
- **Computed:** `visibleReadings` (visible sensors × shown QIs), `selectedReadings`, `formInitial`.
- **Methods:** `setSelection`, `toggleSelected`, `selectAll(ids, on)`, `clearSelection`, `toggleGroup`, and `applyReview({ qi, comment })`, which updates `result` in place.
- Reload and `clear()` also clear the selection.

**Chart additions** (`vnv-chart/`)
- **Brush:** a `brush` option, plus `takeGlobalCursor` while Shift is held over the chart. `brushEnd` calls `selectInRect`.
- **Selection rings:** a `selection` scatter series (hollow `on-surface` rings), merged with the window so the sensor series don't rebuild.
- **Action bar and popover:** `app-selection-action-bar` floats above the selection's top-left. VNV opens `app-vnv-form` in a `cdkConnectedOverlay` popover.
- **New pure helpers** in `vnv-chart-options.ts`: `selectInRect`, `selectionPoints`, `selectionSeries`, `readingsToCsv`.

**Table** (`components/vnv-table/`)
- `VnvTableComponent` (`app-vnv-table`) sits inside `app-chart-card`, with a CSS-grid header and a `cdk-virtual-scroll-viewport` with 49 px items.
- The header checkbox is indeterminate when partial; group checkboxes select their sensor; clicking a row toggles it.
- `vnv-table-rows.ts` holds `buildTableRows`, `sortReadings`, `TableSort` and `DEFAULT_TABLE_SORT`.

**Measured (dev build, 68k rows):** a column sort takes 50–140 ms and grouping ~140 ms.

**Tests:** `vnv-table-rows.spec.ts`, plus additions to `vnv-chart-options.spec.ts` and `vnv-store.spec.ts`.

### Sensor counts (Scarlett, 2026-11-15)

- The VNV graph shows **at most 40 sensors**, and **usually 1–12**.
- **Default states:** every VNV `?state=` now loads the typical case, **241-AN-TMAC-103-TI with 6 sensors** (as in the Figma header). One of its sensors has no data after 03/31/2025, which is realistic and useful for the picker.
- **Stress case:** **`vnv-chart-40-sensors`** loads 241-AN-WSTA-102-TI (40 sensors, including the 5 real ones).
- **Out of service:** `AN103-TMAC-TI-U2-RJA` has an out-of-service window (09/14–09/30/2026), so the default panel shows one.

### Phase 5 · Load sensors form

**Decisions** (Scarlett, 2026-11-15, or Figma-wins)
- **One component at a time:** ticking a sensor in another location switches the selection there. The header shows that location and the number of **loaded** sensors (a subset is allowed).
- **Filters are name tokens:** Add filters lists TI, TMAC, WST and WSTA. A sensor shows only if its location and sensor-id tokens (split on `-`) contain every chip, so WST ≠ WSTA.
- **First visit shows Cancel** (as Figma does), which resets the form. **Set to default** (first visit only) = the **last 3 months of data**, 08/12/2026 – 11/12/2026.
- **Dates are shared with the page header.**
  - Editing the form's dates updates the header straight away.
  - Popover Cancel/Escape/backdrop restores **the range that's loaded** (`store.loadedRange`).
  - A load-form `?state=` shows its fixture dates.
- **No-data sensors:**
  - A notice reads "N sensor(s) with no data in the selected date range" with a **Show all** switch, off by default.
  - With it on, those sensors are dimmed with a "no data" tag and no checkbox, as in the `miller-item` set.
  - In search, groups with no selectable sensors are dimmed.
- **The popover widens from 806 to 968 px while searching**, as Figma's search frame (`1:12068`) does, so "group › location" paths fit.
- **First visit:** the title and form share a centred 1,248 px column (`1:11016`), and the footer is sticky to the window until the form ends.
- **The footer summary** is `<location> | N selected`, in `on-surface-variant`.
- **Fixtures:**
  - `vnv-chart-load-form-open` and `vnv-load-form-search` now use the filter `TI` only; TI + WST + U3 would match nothing.
  - **New** `vnv-load-form-no-data` (`1:11972`).
  - `loadForm.showNoData` added.

**Pieces**
- `feature/vnv/components/load-sensors-form/`:
  - **`LoadSensorsFormComponent`** (`app-load-sensors-form`):
    - Inputs: `mode: 'page' | 'popover'`, `farm`, `sensors`, `loadedSensorIds`, `initial: LoadSensorsInit | null`; model `range`.
    - Outputs: `load: LoadSensorsRequest { locationId, sensorIds, range }`, `cancel`.
    - It exports `defaultLoadRange()`.
  - **`load-sensors-model.ts`** (pure):
    - `tokensOf`, `filterOptions`, `matchesFilters`, `matchesSearch`, `hasData`, `splitName` (stem + bold suffix), `highlight`.
    - `buildTree`, `buildList`, `buildSearch`, `checkState`.
    - `toggleSensor` / `setSensors` (the one-component rule).
- **`VnvMockService.getSensorIndex()`:** every sensor with its data range.
- **`VnvStore` additions:**
  - `loadedSensorIds`, `loadedRange`, `loadFormInit`, `farm`, `sensorIndex`.
  - `loadPickerData()`.
  - `load(locationId, range, sensorIds?)`, which now loads a subset and sets `loading` straight away.
- **`VnvPageComponent`:** with nothing loaded, it renders the form in page mode (first visit). Load data opens it in popover mode with `--load-form-max-height`. `onLoad` loads and switches to Chart view.

**Tests:** `load-sensors-model.spec.ts`, plus additions to `vnv-store.spec.ts`.

### Phase 6 · ILL Scan library

**Decisions** (Scarlett, 2026-11-15, or Figma-wins)
- **The expanded row's chart shows this scan only:** a depth profile (Corrected Counts against "From Bottom of Tank (inches)", 600 → 0), with the Calculated ILL as a mark line. Saved is dashed `on-surface-variant`; unsaved is solid primary. There's no reference scan.
- **Perform analysis / Save analysis act on the selected scans.** Perform runs the Default preset and creates unsaved results; Save saves them. Both are disabled with nothing selected, and Save also needs something unsaved.
- **Row ⋮ menu:** "Open in focus view" and "Export smooth data" (CSV). **This wording is mine and needs Scarlett's confirmation.**
- **Value cells:**
  - Saved only: plain.
  - Unsaved only: primary.
  - Both: two lines, unsaved on top (primary), saved underneath (small).
  - None: `--`.
- **Recent `*`** marks a well with a scan in the last 30 days of data (`recentWells`).
- **Placeholder copy is used verbatim** (lorem subtitle, form subtitles). **Parameters tab:** no frame, so it's empty.
- **Layout:** before loading, a centred 1,248 px column (`1:2014`); after, full width (`1:2094`). The form collapses to a filter summary bar, and **Edit filters** reopens it.
- **Focus links:** Open in focus view goes to `/ill/focus/:wellId`. Adjust in focus view and the ⋮ item add `?tab=<scanId>`.
- **The store is provided at the ILL route level** (a parent route with `providers`), so coming back from the focus view keeps the results, selection and grouping.

**Pieces**
- `core/selection/check-state.ts`: `checkState` moved here from the Load sensors form, now shared (the VNV model re-exports it).
- `styles/components/_filled-fields.scss`: `.app-filled-fields` holds the filled form-field overrides (`surface-variant` container, `on-surface-variant` indicator). Both the Load sensors and Load scans forms use it.
- `feature/ill/`:
  - **`ill-library-store.ts`:** `IllLibraryStore` plus `defaultScanQuery()` and `ScanReview`.
    - Signals: query, form, results, search, grouping, selection, expansion.
    - `loadScans`, `reset`, `editFilters`, `expand`, `performAnalysis`, `saveAnalysis`, `saveRow`, `applyState`.
  - **`library-model.ts`** (pure): `RESULT_COLUMNS`, `valueCell`, `qiLetter`, `recentWells`, `wellLabel`, `summaryParts`, `matchesSearch`, `groupByWell`, `scanToCsv`.
  - **`scan-library-page/`:** header, tabs, form or summary, and the results or empty state. It applies the `ill-library-*` states.
  - **`components/`:**
    - `load-scans-form`, `filter-summary`.
    - `scan-table`: toolbar plus a CSS-grid table, flat or grouped, with expandable rows.
    - `scan-detail`: chart card and analysis card.

**Tests:** `library-model.spec.ts`, `ill-library-store.spec.ts`.

### Phase 7 · ILL focus view

**Decisions** (Scarlett, 2026-11-15, or Figma-wins)
- **All scans is the chart only** (`1:10048`). There's no scan table under it.
- **Calculated ILL lines:** drawn for the focused scan only, in its colour.
  - Saved is solid and unsaved is dashed, matching the legend swatches. Each line has a small value tag.
  - The legend's Saved / Unsaved rows show or hide them.
- **Add scans** is a menu of this well's closed scans; picking one reopens it as a tab. It's disabled when every scan is open.
- **Leaving or closing a tab with unsaved work** opens a dialog:
  - Title "Unsaved analysis", body "You have unsaved analysis results. Save them before you leave?"
  - Buttons Cancel · Discard · Save analysis. Escape or the backdrop counts as Cancel.
  - The wording is agreed; Figma has no frame for it.
- **Unsaved work** means unsaved results or an edited QI or comment. Edited parameters that haven't been run don't count.
- **Primary buttons:**
  - Save analysis is primary while there's something to save; otherwise Run analysis is.
  - Discard (beside Save analysis) appears only with unsaved results; Figma has no Discard.
- **Tabs:**
  - The active-tab underline is **2 px** (Figma), not 3.
  - The dot that replaces the × uses primary (no amber).
- **Edited parameters:** a primary dot before the label, a primary outline, and "Saved <value> <unit>" under the field. Revert appears only on groups with edits.
- **Calculation Baseline and Miscellaneous** are read-only until **Edit** turns their rows into inputs.
  - The preset select loads a preset into the draft.
  - **Save as default** overwrites the in-memory `Default` preset.
- Edits are measured against the **saved** parameters, or the Default preset if nothing is saved. The draft starts at the latest run's parameters.
- **Fixtures:**
  - `ill-scan-zoomed` also seeds one edit (ILL Normal Lower Range 12.000, saved 10.500), matching `1:8968`.
  - `ill-scans-popover` hides all but the focused scan and one other.

**Pieces** (`feature/ill/focus-page/`)
- **`ill-focus-store.ts`:** `IllFocusStore` (provided by the page) and `ALL_TAB`.
  - Signals and computeds: well scans, `openIds`, `active`, the shared `window`, `fitY`, `hidden`, `lines`, `legendOpen`, `paramsOpen`, `editingGroups`, `presets`, plus the per-scan parameter and review drafts.
  - Computed views: `focused`, `visibleScans`, `closedScans`, `draft`, `reference`, `edited`, `review`, `canSave`, `primaryAction`, `dirtyIds`, and `dirty(id)`.
  - Methods:
    - `load(wellId, tab?)`, `applyState`.
    - `select`, `open`, `close`, `setWindow`, `setHidden`, `setAllVisible`.
    - `setField`, `revert`, `editGroup`, `loadPreset`, `saveAsDefault`, `setReview`.
    - `run`, `save(ids?)`, `discard(ids?)`.
  - After a mutation it calls `IllLibraryStore.refresh(ids)` (new), so the library rows stay current.
- **`focus-model.ts`** (pure): `RESULT_ROWS`/`resultRows`, `PARAM_GROUPS` (Figma labels, including "Review tolerence"), `paramValue`/`withParam`/`formatParam`, `referenceParameters`/`initialDraft`/`editedFields`/`groupEdited`, `countsAt`, `depthYRange`, `closedScanIds`.
- **`depth-chart-options.ts`:** `buildDepthChartOptions(data, window, yRange, tagText)`, `depthWindowOption` for `[merge]`, and the hover readout.
- **`focus-page.component.ts`:**
  - The header: a back button and "Scan library" breadcrumb, with the well as the title.
  - The tab bar, then chart + Scan details + Analysis parameters (a scan tab) or the chart alone (All scans).
  - Route inputs: `wellId` and `?tab=`.
  - `confirmLeave()` is wired as the route's `canDeactivate`.
- **`components/`:**
  - `focus-tab-bar`, `focus-chart` (with the legend popover and the shared navigator, `inverse`), `scans-legend`.
  - `scan-details`, `analysis-parameters`, `unsaved-dialog` (the first `MatDialog` in the app).

**Tests:** `focus-model.spec.ts`, `ill-focus-store.spec.ts`.

### Polish pass (after Phase 7)

Checked every frame in dark mode at 1912×1024 against its `?state=` fixture. Fixed the 9 held mismatches and 13 more found in the pass.

**Decisions**
- **One focus ring everywhere:** 2 px primary. Material controls use `mat.strong-focus-indicators`. Our own buttons, links and `[tabindex]` elements get a global outline (`styles/components/_focus.scss`). Set `--app-focus-offset` to change the outline's offset; inset rings in tab bars and tree rows keep their own rule.
- **Loading is a top progress bar or the chart mask, nothing else:**
  - **Tables and pages:** `mat-progress-bar.app-loading-bar`, absolutely positioned on the top edge of its container (`styles/components/_loading-bar.scss`). It shows on:
    - the VNV table while loading or applying;
    - the ILL scan table while loading or busy;
    - VNV first visit while the picker loads.
  - **Charts:** the ECharts mask. It shows on:
    - the VNV chart while loading or applying;
    - the focus chart while loading or busy (run, save, discard).
- **The library's expanded-row chart now uses the focus view's depth chart** (`buildDepthChartOptions(..., { zoom: false })`). Its Calculated ILL lines therefore follow the focus view: the scan's colour, saved solid, unsaved dashed, each with a value tag. This replaces Phase 6's dashed on-surface-variant (saved) and solid primary (unsaved) lines.
- **The locked focused scan** in the scans legend is a normal checked box. It's `disabledInteractive`, `aria-disabled`, and its colours are overridden to the enabled ones.

**Global styles** (`styles/components/`)
- `material-component-overrides/_mat-button-toggle.scss`: every segmented toggle is 36 px including its border, `corner-small`, label-large, selected in secondary-container. Components no longer repeat these overrides; the view switcher overrides colours only.
- `material-component-overrides/_mat-slide-toggle.scss`: switches are 50 × 32 with a label-large label.
- `_data-table.scss`: `.app-data-table` (body-medium, tabular figures) and `.app-data-table__head` (Roboto Bold 14/20). Both tables use them.

**Component changes**
- **`app-chart-card`:** new `variant: 'chart' | 'table'`. `table` uses 24 px padding with the table straight under a 40 px toolbar (1:10947).
- **VNV:**
  - The table columns are Figma's 68 · 410 · 69 · 109 · 175 · 456 · 165; Sensor and Comment flex in that ratio.
  - The chart's Export button is 97 px wide.
  - The selection bar is 94 × 42.
  - Quality chip icons are 18 / 18 / 12 / 16.
  - In label-style panel sections, the label sits 12 px above its content; in the reference panel, the detail rows sit 16 px under the select.
- **ILL library:**
  - The header is 106 px and the tabs 48.
  - With the filter summary showing, there's 16 px either side of the divider.
  - The scan table uses Figma's column widths, 48 px rows, 16 px cell padding, a 431 × 52 search field and a 40 px Group by Well button.
  - The expanded row is inset 32 px with cards at 1092 : 670 and the chart and legend at 721 : 312, and its chart is 466 px tall.
- **ILL focus, Analysis parameters:**
  - Group columns are 577 : 611 : 611.
  - Inputs are 240 px.
  - Group headers are 36 px, so titles align whether or not a group has Edit or Revert.
  - The section title row is 28 px.
