import type { Routes } from '@angular/router';

/** Baseline: a stub for the page being built next. */
export const baselineRoutes: Routes = [
  { path: '', loadComponent: () => import('./baseline-page/baseline-page.component').then((m) => m.BaselinePageComponent) },
];
