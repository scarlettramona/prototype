# Phase 2 · Shared components

Read `docs/prototype-overview.md` (especially **What already exists**) and `CLAUDE.md` first.

## Goal

Build the reusable pieces that appear on several screens, so later phases only assemble them. Add a **component gallery route** (dev-only) showing every component in every state.

**Start in plan mode.** For each component below, propose: name, inputs/outputs, which Material/Pluto component it wraps (if any), and file location. Reuse anything that already exists.

## Figma references

Read these frames to see the components in context (via the Figma MCP):

| Frame | Node | Shows |
|---|---|---|
| VNV chart view | `757:14035` | page header, view switcher, quality filter, chart card, legend panel, reference panel |
| VNV table view | `757:13387` | table, docked VNV panel |
| VNV popover | `757:19990` | VNV form in a popover |
| Graph menu | `757:20015` | ⋯ menu on a chart selection |
| View switcher | `757:14303` | `content-switcher` component set |
| Quality filter | `757:14314` | `filter-toggle` component set |

## Components

1. **Page header (VNV variant):** title · divider · loaded component (name with sensor count under it) · **Load data** button · divider · **date range field** (calendar icon + range + ▾) · **Show all data** switch · spacer · **view switcher**. Has a "nothing loaded" state showing the title only.
2. **Date range field and popover:** clicking the field opens a popover with Start date / End date and Cancel / Apply. Emits the new range.
3. **View switcher:** Table view / Chart view (from `content-switcher`).
4. **Quality filter toggle:** one per QI, each with its shape icon and an on/off state (from `filter-toggle`).
5. **Series swatch:** a short line with a centre dot in a series colour, with an optional dash pattern.
6. **Legend row:** checkbox · swatch · name · muted elevation. States: shown, hidden, locked (checkbox disabled).
7. **Detail row:** label · value · unit, with the value right-aligned in a fixed-width column so values line up. Variants: plain, and with Saved / Unsaved / Δ columns (unsaved values that changed are amber).
8. **Side panel section:** title, optional action link, body; sections separated by a divider.
9. **Select with swatch:** a select whose value shows a series swatch (Baseline sensor, Equipment out of service).
10. **Chart card:** card surface with a toolbar slot, a chart slot, and a navigator slot with − / + / Reset beside the navigator. Purely layout; charts arrive in later phases.
11. **Selection action bar:** `N values selected | VNV | ⋯`, floating; ⋯ opens the graph menu.
12. **VNV form:** Quality indicator (Good / Suspect segmented) · VNV comment · Cancel / Apply. Used in **both** a popover (VNV popover) and a docked side panel (table view), with a header showing `VNV | N values selected` and a close ×.

Use labels exactly as in Figma. Components take data through inputs; none of them fetch data.

## Acceptance

- [ ] Every component is in the gallery in all listed states, in the dark theme
- [ ] Gallery screenshots match the Figma frames' pieces (compare side by side)
- [ ] Only Pluto tokens used; no hard-coded colours (series colours come from the palette module)
- [ ] Keyboard-operable: switchers, toggles, checkboxes, menus
- [ ] **What already exists** updated with each component's selector, inputs/outputs and path

## Out of scope

Full screens, chart rendering, the sensor picker (Phase 5), ILL-specific pieces such as scan tabs (Phase 7).
