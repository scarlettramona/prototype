# Phase 7 · ILL focus view

Read `docs/prototype-overview.md` (especially **What already exists** and the ILL decisions) and `CLAUDE.md` first.

## Goal

The focus view: open scans as tabs, compare depth profiles, review and re-run the analysis, and save or discard.

**Start in plan mode.** This is the largest phase; propose splitting it into two sessions if needed (e.g. 7a layout and chart, 7b analysis states).

## Figma frames

| Frame | Node | Shows |
|---|---|---|
| Scan tab | `757:17887` | Breadcrumb, scan tabs, chart, Scan details, Analysis parameters |
| Scan tab, other state | `757:18428` | Compare with `757:17887` to find the difference (likely saved vs unsaved results) |
| All scans | `757:18962` | All scans tab with the scan table |
| Scans legend popover | `757:19883` | Show/hide scans, with Saved / Unsaved for the focused scan |

## Build

**Layout**
- Breadcrumb back to the **Scan library** and the riser as the page title.
- The **tab bar:**
  - **All scans** pinned on the left; **Add scans** pinned on the right.
  - Scan tabs between them scroll with ‹ › when they overflow.
  - Each scan tab shows the scan's colour dot, its date, and a close ×. The × becomes an **amber dot** while the scan has unsaved work.
  - The active tab is raised, with a 3 px underline in the scan's colour.

**Chart** (in every tab)
- A depth profile: x = depth, **reversed 600 → 0**; y = Corrected Counts.
- All visible scans are drawn. In a scan tab, the focused scan is heavier and on top, and the others are faded. In All scans, all are equal.
- Fit Y, the navigator with − / + / Reset, and the hover readout of every visible scan at that depth.
- **The zoom range is shared across tabs.**
- The **Scans** popover (from the chart header) shows or hides scans. The focused scan is locked on. When it has unsaved results, its row expands into **Unsaved** (solid) and **Saved** (dashed) toggles.
- Calculated ILL as vertical lines: **saved dashed, unsaved solid amber**, each with a small value tag.

**Scan tab panels**
- **Scan details:**
  - The scan's dot and date under the title.
  - The result values in detail rows.
  - The Analysis section: Quality indicator and VNV comment (scan-level QI), plus Saved on / Saved by.
  - **Export smooth data** and **Save analysis**.
- **Analysis parameters:**
  - A preset select with Saved on / Saved by.
  - Save as default and **Run analysis**.
  - Groups: Calculation Baseline, Miscellaneous, ILL method and Marker method.
  - Edited fields get an amber marker, with the saved value shown beneath. **Revert** appears only on groups with changes.

**States** (each reachable by `?state=`)
| State | Scan details | Buttons |
|---|---|---|
| `ill-scan-saved` | single column of saved values | Save analysis primary only if there's something to save |
| `ill-scan-unsaved-rerun` | **Saved / Unsaved / Δ** columns, changed values amber; Discard shown | Save analysis primary |
| `ill-scan-no-analysis` | all results "—" | **Run analysis primary**, Save analysis disabled |
| `ill-scan-first-run-unsaved` | single **Unsaved** column, values plain (nothing to compare against) | Save analysis primary, Discard shown |

**Flows**
- **Run analysis** with edited parameters creates unsaved results (mock service with latency). The tab gets the amber dot and Scan details switch to the comparison layout.
- **Save analysis** commits the results, clears the amber markers and returns to the single column.
- **Discard** drops the unsaved results.
- **All scans tab:** the scan table. Rows show each scan's colour dot and values. Clicking a row opens or jumps to that scan's tab.
- **Leaving with unsaved work** (breadcrumb, closing a tab): ask to save or discard. Use the wording from Figma if the frames include it; otherwise **ask Scarlett** for the wording.

## Acceptance

- [ ] Each frame and every state in the table matches side by side
- [ ] Switching tabs keeps the zoom; Reset applies to all tabs
- [ ] Run → unsaved → Save / Discard works end to end, and the tab dot, lines and panels all update
- [ ] The Scans popover hides and shows scans, with saved/unsaved toggles for the focused scan
- [ ] **What already exists** updated

## After Phase 7

Run a polish pass across both modules: spacing against the frames, focus states, loading states and consistency. Do it as its own session with the full frame list.
