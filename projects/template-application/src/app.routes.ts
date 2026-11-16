import { isDevMode } from '@angular/core';
import type { Route } from '@angular/router';
import { APP_PATHS } from './app/core/routing/app-paths';

/** Top-level routes. Every first-level feature is lazy, registered with `loadChildren()`. */
export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: APP_PATHS.vnv },
  { path: APP_PATHS.vnv, loadChildren: () => import('./app/feature/vnv/vnv.routes').then((m) => m.vnvRoutes) },
  { path: APP_PATHS.ill, loadChildren: () => import('./app/feature/ill/ill.routes').then((m) => m.illRoutes) },
  { path: APP_PATHS.baseline, loadChildren: () => import('./app/feature/baseline/baseline.routes').then((m) => m.baselineRoutes) },
  {
    path: APP_PATHS.dev,
    canMatch: [() => isDevMode()],
    loadChildren: () => import('./app/feature/dev/dev.routes').then((m) => m.devRoutes),
  },
];
