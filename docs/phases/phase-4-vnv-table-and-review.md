# Phase 4 · VNV table view and assigning QI

Read `docs/prototype-overview.md` (especially **What already exists**) and `CLAUDE.md` first.

## Goal

**Table view**, plus the review flow in both views: select readings → VNV form → Apply updates them.

**Start in plan mode.**

## Figma frames

| Frame | Node | State |
|---|---|---|
| Table view, values selected, VNV panel | `757:13387` | `vnv-table-selection` |
| VNV popover (chart) | `757:19990` | `vnv-chart-selection` |
| Graph menu | `757:20015` | ⋯ on the selection action bar |

## Build

**Table view** (switcher at Table view; same page header, filters and data as the chart):
- Use the Pluto `table` component if it fits.
- Columns: selection checkbox · Sensor (swatch, name, elevation) · Date · Value (°F, right-aligned, 2 decimals) · Quality (shape + label) · Comment (one line, truncated) · Reviewer.
- Search, sort by date (newest first by default), and Group by sensor if it's in the frame.
- The quality filter and hidden sensors apply here too.
- Large row counts need virtual scrolling or paging. Follow the frame.

**Selecting readings:**
- **Chart:** an ECharts `brush` (rectangle) selects points. Selected points get a ring, and the **selection action bar** floats above the selection: `N values selected | VNV | ⋯`. **VNV** opens the **VNV popover** beside the selection. ⋯ opens the graph menu (export options for the selection).
- **Table:** checkboxes, including a header checkbox (indeterminate when partial). Selecting shows the **VNV form docked in the right panel**. The table narrows; nothing is covered.
- **The selection carries across views.** Switching Chart ↔ Table keeps the same readings selected.

**Applying:**
- Apply sets the chosen QI and comment on every selected reading (mock service, in memory), records the reviewer as the current user, then clears the selection and closes the form.
- The chart markers and table rows update immediately.
- Cancel or close clears the form without changes. Escape closes the popover.

## Acceptance

- [ ] `?state=vnv-table-selection` matches `757:13387`; `?state=vnv-chart-selection` matches `757:19990` in context
- [ ] Brush select → action bar → popover → Apply works end to end, and the chart and table both reflect it
- [ ] The selection survives switching views
- [ ] Keyboard: table checkboxes, the form and Escape to close
- [ ] **What already exists** updated

## Out of scope

The load form (Phase 5), anything ILL.
