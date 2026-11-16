# Phase 5 · Load sensors form (sensor picker)

Read `docs/prototype-overview.md` (especially **What already exists**) and `CLAUDE.md` first.

## Goal

The form for choosing what VNV shows, in its two placements:
- **First visit:** nothing loaded yet, so the form **is the page content**, under the page title only.
- **Once data is loaded:** **Load data** in the page header opens the same form as a **popover**, pre-filled with what's loaded, so people can switch components or start over in place.

**Start in plan mode.**

## Figma frames

| Frame | Node | Shows |
|---|---|---|
| First visit | `757:13484` | `vnv-first-visit` |
| Chart view with form open | `757:13636` | `vnv-chart-load-form-open` |
| Form states | `757:20032`, `757:20218`, `757:20410`, `757:20603`, `757:20801` | browse; loaded tags; and further states (open each frame to see which: no-data handling and search) |

## Build

- **Form layout** (top to bottom): title "Load sensors" · Farm · Start date / End date · Search sensors + Add filters + filter chips · **two columns**: location tree (left) and sensor list for the selected location (right) · **footer** with the selection summary (e.g. `241-AN-TMAC-102-TI | 3 selected`) and Cancel / **Load sensors**.
- **Tree:** expandable groups and locations, with a count of selected sensors on each location.
- **Sensor list:** Select all (indeterminate when partial), one checkbox row per sensor, and a **loaded** tag on sensors already loaded.
- **Search** filters both columns. Filter chips can be removed.
- **Sensors with no data in the date range** follow the frames (shown disabled or hidden, as designed).
- **First visit:**
  - Nothing is selected.
  - **Load sensors** is disabled until at least one sensor is selected.
  - No Cancel.
  - The footer **sticks to the bottom of the viewport** while the page scrolls and settles at the end of the form.
- **Popover:**
  - Pre-filled with the loaded selection and date range.
  - The tree and list scroll inside it; the footer stays at its bottom.
  - Cancel closes it without changes. **Load sensors** replaces the loaded data (with a loading state) and updates the page header.
- The form's date range and the page header's date range are **the same value**: editing one updates the other.

## Acceptance

- [ ] `?state=vnv-first-visit` and `?state=vnv-chart-load-form-open` match their frames
- [ ] Every form state in the frames can be reached and looks right
- [ ] Choosing different sensors and loading them replaces the chart and table data
- [ ] The sticky footer behaves as described at a laptop height (~800 px)
- [ ] **What already exists** updated

## Out of scope

Anything ILL.
