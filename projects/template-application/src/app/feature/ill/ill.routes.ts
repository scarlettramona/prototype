import type { Routes } from '@angular/router';
import { APP_PATHS } from '../../core/routing/app-paths';

/** ILL: the Scan library (Phase 6) and the focus view (Phase 7). */
export const illRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./scan-library-page/scan-library-page.component').then((m) => m.ScanLibraryPageComponent),
  },
  {
    path: `${APP_PATHS.illFocus}/:wellId`,
    loadComponent: () => import('./focus-page/focus-page.component').then((m) => m.FocusPageComponent),
  },
];
