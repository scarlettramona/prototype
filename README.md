# Template Workspace

An Angular workspace to start new projects from. It ships the plumbing every
app ends up needing — theming, layout shell, routing conventions, shared UI
primitives, and a component library — with no business domain baked in.

Generated with [Angular CLI](https://github.com/angular/angular-cli) 21.

## What's in here

| Project                | Type        | Description                                                                           |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `template-application` | application | The app shell: layout, routing, theming, shared components, and a component showcase. |
| `beta-library`         | library     | Publishable UI library: callouts, inline notifications, lozenges, and toasts.         |

The only feature in the app is `feature/components`, a live showcase of the
library plus a Material "kitchen sink". Delete it once your own features exist,
or keep it around as a styling reference.

## Architecture

The app follows the frontend architecture section of the SDD. Code is divided
into architecture areas, each with one loading policy and one set of areas it
may depend on. The dependency rules are enforced in CI, not just in review —
see [Conformance](#conformance).

### Project parameters

| Parameter                       | Value for this project                                        |
| ------------------------------- | ------------------------------------------------------------- |
| Application shell model         | Single shell                                                  |
| Maximum feature nesting depth   | 1                                                             |
| Route preloading                | Disabled                                                      |
| `ui/` structure                 | One consolidated area                                         |
| Type-only imports               | Governed by the dependency table                              |
| Shared component library        | `beta-library`                                                |
| Global style and token location | `projects/template-application/src/styles/`                   |
| Boundary enforcement tooling    | `eslint-plugin-boundaries` + `scripts/check-architecture.mjs` |

### Structure

```text
projects/template-application/src/
  main.ts                    bootstrap
  app.component.ts           bootstrap — renders the single shell
  app.config.ts              bootstrap — delegates to provideCore()
  app.routes.ts              bootstrap — top-level lazy routes
  environments/              build-time configuration
  styles/                    global styles, theme, design tokens
  app/
    core/                    headless shared logic; no components
      config/                ENVIRONMENT token and its provider
      date/                  date adapter, date/time helpers
      http/                  HTTP infrastructure
      icons/                 SVG icon registration
      routing/               path + URL maps, breadcrumbs, router guards
      storage/               localStorage wrapper token
      theme/                 light/dark theme state
      core.providers.ts      provideCore(), composed from the above
    layout/                  application shell; eager
    ui/
      components/            generic units; inputs and outputs only
      patterns/              reusable non-routed use cases; may consume core/
    feature/                 routed workflows; every first-level feature is lazy
      components/
        components.routes.ts
        pages/
        sub-features/
          kitchen-sink/
            kitchen-sink.routes.ts
            pages/
```

### Dependency rules

| Area                           | Loading                                      | May depend on                                                       |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------- |
| `core/`                        | Scope per service; placement by import graph | `core/`                                                             |
| `layout/`                      | Eager                                        | `layout/`, `core/`, `ui/`                                           |
| `ui/`                          | Set by the importing code                    | `core/`, `ui/`                                                      |
| Feature routes (`*.routes.ts`) | Lazy relative to its parent                  | `core/`, same feature's implementation, direct sub-features' routes |
| Feature implementation         | Lazy                                         | `core/`, `ui/`, same feature, ancestor feature                      |
| Bootstrap files                | Eager                                        | Bootstrap, `environments/`, `core/`, `layout/`, first-level routes  |

Anything not listed is denied. A few consequences worth stating outright:

- **Siblings never import each other.** If two features need the same thing,
  extract it up to `core/` (headless), `ui/components/` (generic UI), or
  `ui/patterns/` (both), and have each depend on that.
- **An ancestor never imports a sub-feature**, since a static import would pull
  the sub-feature into the ancestor's bundle and undo its lazy loading. A
  sub-feature reading from its ancestor is fine.
- **Cross-feature navigation goes through `core/routing/`**, never a literal
  path string — a feature cannot import a sibling's constants.
- **Type-only imports follow the same table.** Having no runtime cost does not
  change the ownership question.
- **`ui/components/` takes data through inputs and outputs only.** A unit that
  needs an application service is a pattern, not a component.

### Adding a feature

1. Decide first-level or sub-feature. If it would nest only for naming reasons,
   it is first-level.
2. Create `app/feature/<name>/<name>.routes.ts`. Add `<name>.constants.ts` only
   when the routes file and the implementation need the same path values.
3. Register it with `loadChildren()` and a dynamic import — in `app.routes.ts`
   for a first-level feature, in the parent's routes file for a sub-feature.
4. Add its segments to `core/routing/app-paths.ts` and its URLs to
   `core/routing/routes.ts` if anything outside the feature links to it. The
   sidenav lives in `layout/` and can only read them from `core/`.
5. Keep the implementation inside the feature folder. Do not pre-place code in
   `core/` or `ui/` for reuse that has not happened yet.
6. Give feature-scoped services route-level `providers`, and record a reset
   strategy for any that hold transient state.

### Conformance

`npm run lint` runs [`eslint-plugin-boundaries`](https://www.jsboundaries.dev/)
over the dependency table above: each area is matched by path, and a policy
that does not allow an import fails the build. Route configuration is selected
by filename within a feature, because a `*.routes.ts` file has to be reachable
from its parent while the implementation beside it must not be.

Two rules cannot be expressed as import rules, so `npm run lint:arch`
(`scripts/check-architecture.mjs`) covers them: feature nesting depth, and the
requirement that `core/` stay headless. `npm run verify` runs both.

What the automated checks do **not** cover, and review still has to: placement
by area and domain, collocation and extraction decisions, service scope and
lifecycle, design-token use, and library-over-local-reimplementation.

## Getting started

```bash
npm install
npm start          # dev server on http://localhost:4200/
```

The app imports `beta-library` from `dist/`, so the library has to be built
first. Every script that needs it (`start`, `build`, `test`, `watch`) builds it
for you — run `npm run build:lib` by hand only if you want it on its own.

## Making it yours

1. Rename the `template-application` project in `angular.json`, `package.json`,
   the `projects/` directory, and the `APP` path in `eslint.config.js`; update
   `<title>` in `src/index.html`.
2. Point `src/environments/environment.ts` at your API and add whatever fields
   your app needs to the `Environment` type in `app/core/config/environment.token.ts`.
3. Add app-wide providers through a per-concern `provide*()` function under
   `app/core/`, composed into `provideCore()` — not inline in `app.config.ts`.
4. Add a feature (see [Adding a feature](#adding-a-feature)) and its nav entries
   in `app/layout/sidenav/sidenav.config.ts`.
5. Swap the logos in `projects/template-application/public/` and adjust the
   palettes in `src/styles/base/`.
6. If the workspace stops being a subdirectory of the git root, simplify the
   `prepare` script to plain `husky` and drop the `cd` line from each hook.

## Scripts

| Command                | What it does                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `npm start`            | Dev server with hot reload                                      |
| `npm run build`        | Production build of library + app into `dist/`                  |
| `npm run build:lib`    | Build `beta-library` only                                       |
| `npm test`             | Unit tests for both projects, via [Vitest](https://vitest.dev/) |
| `npm run test:watch`   | App unit tests in watch mode                                    |
| `npm run lint`         | ESLint over both projects, architecture boundaries included     |
| `npm run lint:fix`     | ESLint autofix                                                  |
| `npm run lint:arch`    | Structural checks: nesting depth, headless `core/`              |
| `npm run format:check` | Prettier check                                                  |
| `npm run format:fix`   | Prettier write                                                  |
| `npm run verify`       | Format, lint, architecture, test, build — what CI should run    |

Husky hooks keep that honest: `pre-commit` formats staged files with
lint-staged, `commit-msg` enforces [conventional commits](https://www.conventionalcommits.org/),
and `pre-push` runs the linter.

### Bundle budgets

The production build fails over 1 MB and warns over 750 kB of initial JS. The
Material-based shell alone is roughly 665 kB raw (~155 kB transferred), so the
warning threshold leaves room for a feature or two before it needs a look.

## Scaffolding

```bash
ng generate component features/my-feature/my-page
ng generate --help
```

## Additional resources

- [Angular CLI reference](https://angular.dev/tools/cli)
- [Angular Material](https://material.angular.dev/)
