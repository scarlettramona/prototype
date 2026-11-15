import type { Route } from '@angular/router';

import { APP_PATHS } from './app/core/routing/app-paths';

/**
 * Top-level routes. Every first-level feature is lazy and is reached through
 * `loadChildren()`; the shell around them is rendered by the root component.
 */
export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: APP_PATHS.components.base,
  },
  {
    path: APP_PATHS.components.base,
    data: { breadcrumb: 'Components' },
    loadChildren: () => import('./app/feature/components/components.routes').then((m) => m.COMPONENTS_ROUTES),
  },
];
