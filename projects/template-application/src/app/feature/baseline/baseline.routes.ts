import type { Routes } from '@angular/router';

/** Baseline modifications and review. */
export const baselineRoutes: Routes = [
  { path: '', loadComponent: () => import('./baseline-page/baseline-page.component').then((m) => m.BaselinePageComponent) },
];
