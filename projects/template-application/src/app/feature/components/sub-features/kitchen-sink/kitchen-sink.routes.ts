import type { Route } from '@angular/router';

import { APP_PATHS } from '../../../../core/routing/app-paths';

export const KITCHEN_SINK_ROUTES: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: APP_PATHS.components.kitchenSink.formControls,
  },
  {
    path: APP_PATHS.components.kitchenSink.formControls,
    data: { breadcrumb: 'Form controls' },
    loadComponent: () =>
      import('./pages/form-controls/form-controls-page.component').then((m) => m.FormControlsPageComponent),
  },
  {
    path: APP_PATHS.components.kitchenSink.selectionControls,
    data: { breadcrumb: 'Selection controls' },
    loadComponent: () =>
      import('./pages/selection-controls/selection-controls-page.component').then(
        (m) => m.SelectionControlsPageComponent,
      ),
  },
  {
    path: APP_PATHS.components.kitchenSink.pickers,
    data: { breadcrumb: 'Pickers' },
    loadComponent: () => import('./pages/pickers/pickers-page.component').then((m) => m.PickersPageComponent),
  },
  {
    path: APP_PATHS.components.kitchenSink.cardsChips,
    data: { breadcrumb: 'Cards & chips' },
    loadComponent: () =>
      import('./pages/cards-chips/cards-chips-page.component').then((m) => m.CardsChipsPageComponent),
  },
  {
    path: APP_PATHS.components.kitchenSink.layoutNav,
    data: { breadcrumb: 'Layout & navigation' },
    loadComponent: () => import('./pages/layout-nav/layout-nav-page.component').then((m) => m.LayoutNavPageComponent),
  },
  {
    path: APP_PATHS.components.kitchenSink.overlays,
    data: { breadcrumb: 'Overlays' },
    loadComponent: () => import('./pages/overlays/overlays-page.component').then((m) => m.OverlaysPageComponent),
  },
];
