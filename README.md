# Prototype

An Angular 21 workspace with two projects:

| Project                | Type        | Description                                                                 |
| ---------------------- | ----------- | --------------------------------------------------------------------------- |
| `template-application` | application | The UI shell: header, footer, light/dark theme. No features yet.            |
| `beta-library`         | library     | UI library: callouts, inline notifications, lozenges, toasts.               |

## Getting started

```bash
npm install
npm start          # dev server on http://localhost:4200/
```

The app imports `beta-library` from `dist/`, so the library is built first.
`start`, `build`, `watch` and `test` all do that for you.

## Structure

```text
projects/template-application/src/
  main.ts                 bootstrap
  app.component.ts        bootstrap
  app.config.ts           bootstrap — all app-wide providers
  app.routes.ts           bootstrap — top-level lazy routes
  styles/                 global styles, theme, design tokens
  app/
    core/                 headless shared logic; no components
      <domain>/           business domain: services, state, guards, models
      <concern>/          cross-cutting: routing, http, util
    layout/               application shell; eager
    ui/
      components/         generic presentational units; inputs and outputs only
      patterns/           reusable non-routed use cases; can consume core/
    feature/              routed business workflows; every first-level feature is lazy
      <feature>/
        <feature>.routes.ts
        <feature>.constants.ts
        sub-features/
          <sub-feature>/
```

What's there today: `layout/` (header, footer and the shell around the router
outlet), `core/theme/` (light/dark theme), `core/charts/` (ECharts setup),
`ui/patterns/theme-button/` and `ui/components/label-above/`.

### Form field with the label above

Add `appLabelAbove` (from `ui/components/label-above/`) to a `mat-form-field`
to put its `<mat-label>` above the container instead of inside it. It works
with both `fill` and `outline`:

```html
<mat-form-field appearance="outline" appLabelAbove>
  <mat-label>Scan comment</mat-label>
  <input matInput placeholder="Placeholder" />
</mat-form-field>
```

The styles are in `styles/components/material-component-overrides/_mat-form-field.scss`.

### Adding a feature

1. Create `app/feature/<name>/<name>.routes.ts`, with its page components in
   folders beside it. Add `<name>.constants.ts` for route segments that the
   routes file and anything else share.
2. Register it in `app.routes.ts` with `loadChildren()` and a dynamic import.
   A sub-feature goes under `sub-features/` and is registered in its parent's
   routes file the same way.
3. Keep code inside the feature until a second feature needs it, then move it
   to `core/` (headless) or `ui/` (presentational).

## Charts

Charts use [Apache ECharts](https://echarts.apache.org/) through
[ngx-echarts](https://github.com/xieziyu/ngx-echarts). ECharts is loaded lazily,
the first time a chart renders, so it does not add to the initial bundle.

Only the chart types and components registered in `app/core/charts/echarts.ts`
are included: bar, line, pie and scatter charts; dataset, dataZoom, grid,
legend, markLine, title and tooltip components. Register anything else there
before using it in a chart's options, or ECharts will ignore it.

```ts
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsCoreOption } from 'echarts/core';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  imports: [NgxEchartsDirective],
  template: `<div echarts [options]="options" [theme]="theme() === 'dark' ? 'dark' : ''" class="chart"></div>`,
  styles: `.chart { height: 360px; }`,
})
export class ReadingsChartComponent {
  protected readonly theme = inject(ThemeService).theme;

  readonly options: EChartsCoreOption = {
    backgroundColor: 'transparent', // let the app surface show through
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: [120, 132, 101] }],
  };
}
```

- The chart element needs a height; ECharts fills its container.
- Binding `[theme]` as above makes the chart follow the app's light/dark toggle
  (the chart re-renders when it changes).
- Charts resize with their container automatically.

## Scripts

| Command              | What it does                                                    |
| -------------------- | --------------------------------------------------------------- |
| `npm start`          | Dev server with hot reload                                      |
| `npm run build`      | Production build of library + app into `dist/`                  |
| `npm run build:lib`  | Build `beta-library` only                                       |
| `npm test`           | Unit tests for both projects, via [Vitest](https://vitest.dev/) |
| `npm run test:watch` | App unit tests in watch mode                                    |
| `npm run verify`     | Test and build                                                  |

The production build fails over 1 MB and warns over 750 kB of initial JS.

## Additional resources

- [Angular CLI reference](https://angular.dev/tools/cli)
- [Angular Material](https://material.angular.dev/)
