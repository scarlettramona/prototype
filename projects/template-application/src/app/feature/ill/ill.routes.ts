import type { Routes } from '@angular/router';
import { APP_PATHS } from '../../core/routing/app-paths';
import { IllLibraryStore } from './ill-library-store';

/**
 * ILL: the Scan library (Phase 6) and the focus view (Phase 7).
 * The library store lives at this level so results, selection and filters
 * survive a trip to the focus view and back (and the focus view can refresh
 * the rows it saves).
 */
export const illRoutes: Routes = [
  {
    path: '',
    providers: [IllLibraryStore],
    children: [
      {
        path: '',
        loadComponent: () => import('./scan-library-page/scan-library-page.component').then((m) => m.ScanLibraryPageComponent),
      },
      {
        path: `${APP_PATHS.illFocus}/:wellId`,
        loadComponent: () => import('./focus-page/focus-page.component').then((m) => m.FocusPageComponent),
        // Unsaved work: ask to save or discard before leaving.
        canDeactivate: [(page: { confirmLeave(): Promise<boolean> }) => page.confirmLeave()],
      },
    ],
  },
];
