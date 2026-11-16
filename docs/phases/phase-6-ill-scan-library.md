# Phase 6 · ILL Scan library

Read `docs/prototype-overview.md` (especially **What already exists**) and `CLAUDE.md` first.

## Goal

The ILL entry screen, where people find scans and open them in the focus view.

**Start in plan mode.** Open every frame below first, then describe back what each one shows and how they connect before proposing the build. These screens weren't covered in the shared decisions, so **ask about any behaviour the frames don't make clear.**

## Figma frames

| Frame | Node | Notes |
|---|---|---|
| Library, no scans loaded | `757:14857` | `ill-library-empty`: Load scans form (Start date, End date, Well, Quality indicator, Analysis) and an empty results area |
| Library with results | `757:14937` | `ill-library-results` |
| Further library states | `757:15176`, `757:15233`, `757:15308` | Inspect: likely loading or selection states, and a VNV action on scans |

## Build (confirm against the frames)

- **Route** for ILL with the page title and the **Scan Library / Parameters** tabs shown in the frames. Build only what the frames show for Parameters, or leave it as a stub if it's empty.
- **Load scans form:** dates, well, Quality indicator (Any / Good / Suspect / Not set), Analysis (Any / Saved / Unsaved), **Load scans** and **Reset**.
- **Results:** the scans matching the form (from the mock service, with a loading state), presented as in the frames.
- **Opening scans:** selecting scans and opening them takes the user to the **focus view** (Phase 7) with those scans as tabs. Until Phase 7 exists, route to a placeholder.
- If a frame shows assigning a scan-level QI from the library, it uses the shared **VNV form** with the scan count instead of the value count.

## Acceptance

- [ ] Each frame's state can be reached by `?state=` and matches its frame
- [ ] Form filters change the results (mock filtering)
- [ ] Opening scans passes them to the focus-view route
- [ ] **What already exists** updated, including any behaviour decisions confirmed with Scarlett

## Out of scope

The focus view itself (Phase 7).
