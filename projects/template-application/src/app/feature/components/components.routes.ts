import type { Route } from '@angular/router';

import { COMPONENTS_PATHS } from './components.constants';

export const COMPONENTS_ROUTES: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: COMPONENTS_PATHS.buttons,
  },
  {
    path: COMPONENTS_PATHS.buttons,
    data: { breadcrumb: 'Buttons' },
    loadComponent: () => import('./button-demo/button-demo.component').then((m) => m.ButtonDemoComponent),
  },
  {
    path: COMPONENTS_PATHS.notifications,
    data: { breadcrumb: 'Notifications' },
    loadComponent: () =>
      import('./notifications-demo/notifications-demo.component').then((m) => m.NotificationsDemoComponent),
  },
  {
    path: COMPONENTS_PATHS.lozenges,
    data: { breadcrumb: 'Lozenges' },
    loadComponent: () => import('./lozenges-demo/lozenges-demo.component').then((m) => m.LozengesDemoComponent),
  },
  {
    path: COMPONENTS_PATHS.kitchenSink.base,
    data: { breadcrumb: 'Kitchen Sink' },
    loadChildren: () => import('./sub-features/kitchen-sink/kitchen-sink.routes').then((m) => m.KITCHEN_SINK_ROUTES),
  },
];
