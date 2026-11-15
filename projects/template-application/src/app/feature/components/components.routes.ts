import type { Route } from '@angular/router';

import { APP_PATHS } from '../../core/routing/app-paths';

export const COMPONENTS_ROUTES: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: APP_PATHS.components.buttons,
  },
  {
    path: APP_PATHS.components.buttons,
    data: { breadcrumb: 'Buttons' },
    loadComponent: () => import('./pages/button-demo/button-demo.component').then((m) => m.ButtonDemoComponent),
  },
  {
    path: APP_PATHS.components.notifications,
    data: { breadcrumb: 'Notifications' },
    loadComponent: () =>
      import('./pages/notifications-demo/notifications-demo.component').then((m) => m.NotificationsDemoComponent),
  },
  {
    path: APP_PATHS.components.lozenges,
    data: { breadcrumb: 'Lozenges' },
    loadComponent: () => import('./pages/lozenges-demo/lozenges-demo.component').then((m) => m.LozengesDemoComponent),
  },
  {
    path: APP_PATHS.components.kitchenSink.base,
    data: { breadcrumb: 'Kitchen Sink' },
    loadChildren: () => import('./sub-features/kitchen-sink/kitchen-sink.routes').then((m) => m.KITCHEN_SINK_ROUTES),
  },
];
