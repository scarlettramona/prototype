# Phase 3 · VNV chart view

Read `docs/prototype-overview.md` (especially **What already exists**) and `CLAUDE.md` first.

## Goal

The VNV screen in **Chart view**, loaded with data, assembled from the shared components and driven by the mock services and `?state=` fixtures.

**Start in plan mode.**

## Figma frames

| Frame | Node | State |
|---|---|---|
| Chart view, loaded | `757:14035` | `vnv-chart` |
| Chart view, load form open | `757:13636` | `vnv-chart-load-form-open` (form contents come in Phase 5; show the popover container only) |
| Graph menu | `757:20015` | ⋯ menu |

## Build

- **Route** for the VNV screen inside the shell.
- **Page header** with the loaded component, sensor count, date range and Show all data. The view switcher sits at **Chart view**.
- **Chart card**, with the quality filter toggles and **Export** in its toolbar:
  - A **time series** (x = date/time, y = °F) with one line per visible sensor and a **marker on every reading** in the QI symbol. Colour by sensor, from the palette.
  - **Baseline** as a dashed line inside a faint limit band (baseline ± offsets); **Equipment out of service** as a shaded date band (`markArea`).
  - **Fit Y**, the navigator (`dataZoom` slider) with − / + / Reset beside it, and the hover readout, all as described in the overview.
- **Right panel:** reference settings first (Baseline sensor section, Equipment out of service section, using detail rows and selects), then **Legend** last. It lists every loaded sensor as a legend row with a checkbox to show or hide it, and the panel scrolls when there are up to 40 sensors.
- **Quality filter:** hides or shows the **points** of a QI (not whole lines), via `rect`/visibility per point or separate scatter series, whichever is cleaner.
- **Export menu:** "chart image" uses ECharts' `getDataURL`. Data export can be a no-op that looks real.
- **Date range field:** Apply reloads the same sensors for the new range (mock service call, loading state).
- **Load data** opens the load form popover (Phase 5 fills it; for now an empty popover container anchored to the button).

## Acceptance

- [ ] `?state=vnv-chart` matches frame `757:14035` side by side (screenshot it)
- [ ] 40 sensors render smoothly; the legend scrolls; dash patterns kick in after 10
- [ ] Quality filters, legend checkboxes, Fit Y, navigator, − / + / Reset and the hover readout all work
- [ ] Changing the date range shows a loading state, then new data
- [ ] **What already exists** updated

## Out of scope

Table view, selecting values and the VNV form (Phase 4), load form contents (Phase 5).
