import type { Route } from '@angular/router';

import { COMPONENTS_PATHS } from './app/feature/components/components.constants';

/** Top-level routes. Every first-level feature is lazy. */
export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: COMPONENTS_PATHS.base },
  {
    path: COMPONENTS_PATHS.base,
    data: { breadcrumb: 'Components' },
    loadChildren: () => import('./app/feature/components/components.routes').then((m) => m.COMPONENTS_ROUTES),
  },
];
