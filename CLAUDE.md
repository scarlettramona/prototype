# CLAUDE.md

A **clickable, no-backend prototype** of two PIWA modules, **VNV** and **ILL**, built inside an Angular 21 template app.

## Read first, every session

1. `docs/prototype-overview.md`: what we're building, shared decisions, the Figma node map, and **What already exists**.
2. Your phase brief in `docs/phases/`.

**Figma wins.** Where the docs and Figma disagree, follow Figma file `Eb0lHuZv2e067FftD2RuqL`. Never use the file or the `757:xxxx` node IDs named in the phase briefs; translate them with the node map in the overview. Use the docs only for behaviour the frames don't show. If a conflict matters, say so briefly and follow Figma.

## Standing rules

- **Tokens for every colour, spacing and type value.** No hard-coded hex values in components. The one exception is the chart palette module (`app/core/charts/`).
- **Angular Material components before custom ones.** Style them with `mat.*-overrides()` mixins or `--mat-*` tokens, not by overriding internal classes. `_mat-form-field.scss` is the existing exception.
- **Charts only through `ngx-echarts`**, using the shared theme and palette module. Register every chart type or component in `app/core/charts/echarts.ts` before using it, or ECharts silently ignores it.
- **Prototype only.** No backend, no auth, no persistence beyond memory. All data comes from the mock services.
- **Don't restructure the template shell; add to it.**
- **Copy comes from Figma, exactly.** Don't add helper text, empty states or explanations that aren't in a frame. If copy seems missing, ask. Labels come from Figma; values come from the mock data.
- **End of each phase:** update **What already exists** in `docs/prototype-overview.md`, update this file if you added a convention, and make sure `npm run verify` passes.

## Stack

- Angular 21: standalone components only, `ChangeDetectionStrategy.OnPush`, zoneless (`provideZonelessChangeDetection`). No NgModules.
- **Signals for state** (`signal`, `computed`, `input()`, `output()`, `model()`). Use RxJS only at async edges (HTTP, latency), converting with `toSignal` / `firstValueFrom`.
- Angular Material 21 (M3), Material Symbols Rounded icons (`<mat-icon>name</mat-icon>`).
- ECharts 6 via ngx-echarts 21, loaded lazily.
- Vitest for unit tests (`*.spec.ts` next to the file).
- Strict TypeScript and strict templates. Single quotes and 2-space indents (`.editorconfig`).

## Tokens ("Pluto")

"Pluto" is the Material M3 system token set plus a few app tokens. Figma variable names map directly to CSS:

| Figma variable | CSS |
|---|---|
| `pluto-material/surface/surface`, `…/surface-container`, `…/surface-container-high` … | `var(--mat-sys-surface)`, `var(--mat-sys-surface-container)`, `var(--mat-sys-surface-container-high)` … |
| `pluto-material/surface/on-surface`, `…/on-surface-variant` | `var(--mat-sys-on-surface)`, `var(--mat-sys-on-surface-variant)` |
| `pluto-material/miscellaneous/outline`, `…/outline-variant` | `var(--mat-sys-outline)`, `var(--mat-sys-outline-variant)` |
| `pluto-material/primary/*`, `…/secondary/*` | `var(--mat-sys-primary)`, `var(--mat-sys-secondary-container)` … |
| `pluto-custom/app-shell`, `pluto-custom/app-on-shell` | `var(--app-shell-background)`, `var(--app-shell-on-background)` |
| `typography/font-<role>` (e.g. `font-title-large`) | `font: var(--mat-sys-<role>)` (e.g. `var(--mat-sys-title-large)`) |
| `corner-radius/corner-<size>` | `var(--mat-sys-corner-<size>)` |
| `spacing-*` | **match by pixel value** to `var(--spacing-NNN)`, where NNN is px × 10: `spacing-md` (8) → `--spacing-80`, `spacing-lg` (12) → `--spacing-120`, `spacing-3xl` (24) → `--spacing-240` |

- Use the template's `--spacing-NNN` scale (`styles/base/_spacing.scss`) in app code. Don't use beta-library's `--spacing-sm…5xl`, because Figma's `3xl` (24px) differs from the library's `3xl` (32px).
- Status colours: `var(--status-<success|warning|danger|information|neutral>-<step>)` from beta-library.
- App-specific colour tokens go in `styles/base/_component-palette.scss` as `--app-*`, using `light-dark()`.
- The palette source is `styles/base/_theme-palette.scss` (generated; don't hand-edit). Dark/light overrides are in `styles/base/material-system-overrides/_palette-overrides.scss`.
- **The designs are dark mode only.** Check work against Figma in dark. Keep the light toggle working, but don't design for it.

## Structure

```text
projects/template-application/src/
  app.routes.ts         top-level lazy routes
  app.config.ts         app-wide providers
  styles/               global styles and tokens
  app/
    core/<domain>/      headless: models, mock services, state (vnv/, ill/, mock-data/, prototype-state/)
    core/charts/        ECharts registration, theme, palette module
    layout/             shell: header, footer
    ui/components/      presentational: inputs/outputs only, never fetch data
    ui/patterns/        reusable non-routed pieces; may use core/
    feature/<name>/     routed, lazy: <name>.routes.ts, <name>.constants.ts, sub-features/
public/                 static assets, served from the site root (mock CSVs go in public/mock-data/)
```

- Every first-level feature is lazy: register it in `app.routes.ts` with `loadChildren()`.
- Keep code inside its feature until a second feature needs it, then move it to `core/` (headless) or `ui/` (presentational).
- File names are kebab-case with a type suffix: `foo.component.ts`, `foo.service.ts`, `foo.models.ts`, `foo.routes.ts`. Selectors use the `app-` prefix.
- **Component style budget:** warns at 4 kB and fails at 8 kB per component. Push shared styling into global partials or tokens.
- `beta-library` (callout, inline notification, lozenge, toast) is imported from `dist/`, so it must be built first. The npm scripts do this for you.

## Commands

| Command | Use |
|---|---|
| `npm start` | Dev server at http://localhost:4200 |
| `npm run build` | Production build (library + app) |
| `npm test` | Unit tests for both projects |
| `npm run verify` | Tests + build. **Run before finishing a phase.** |

There is **no linter**; ESLint and Prettier were removed from the template. Keep code formatted to match the surrounding files.

## UI conventions

- **Popovers:** use a CDK `cdkConnectedOverlay` with `[cdkConnectedOverlayHasBackdrop]="true"` and `cdkConnectedOverlayBackdropClass="app-popover-backdrop"`, close on `backdropClick` and on Escape (`overlayKeydown`), and put `.app-popover` on the content root. Add `cdkTrapFocus cdkTrapFocusAutoCapture` so focus moves in and returns to the trigger.
- **Vertical rules** between groups in a row use `<span class="app-divider-vertical"></span>`.
- **Filled form fields** (Figma's `surface-variant` style) get `class: 'app-filled-fields'` on a host or wrapper (`styles/components/_filled-fields.scss`). Don't repeat the overrides per component.
- **Shared selection state:** tri-state checkboxes use `checkState()` from `core/selection/check-state.ts`.
- **No amber.** Unsaved or changed values use `--mat-sys-primary`.
- **VNV legend rows toggle on click** (no checkbox). The ILL scans legend uses checkboxes.
- **Big charts:** build the full ECharts option only when the data changes, and send window and y-range changes through ngx-echarts `[merge]`. Read the window `untracked` in the full-option computed. Use `[x, y]` arrays plus a `symbol` callback, not an object per point. See the "Chart performance rules" in the overview.
- **Zoom windows** are shared through a `window` model (`{ start, end } | null`, where `null` is the full range). Use `app-chart-navigator` for navigators.
- Check shared components in `/dev/gallery`, and add new shared pieces there with their states.

## Prototype mechanics

- Mock services add 300–800 ms of latency. Mutations live in memory until reload.
- `?state=<name>` jumps to a named screen state; a dev-only menu lists them.
- Mock data generation is seeded: the same seed gives the same output. Real CSV rows are never altered.
