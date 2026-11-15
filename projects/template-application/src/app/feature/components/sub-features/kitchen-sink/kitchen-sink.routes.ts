import type { Route } from '@angular/router';

import { COMPONENTS_PATHS } from '../../components.constants';

export const KITCHEN_SINK_ROUTES: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: COMPONENTS_PATHS.kitchenSink.formControls,
  },
  {
    path: COMPONENTS_PATHS.kitchenSink.formControls,
    data: { breadcrumb: 'Form controls' },
    loadComponent: () =>
      import('./form-controls/form-controls-page.component').then((m) => m.FormControlsPageComponent),
  },
  {
    path: COMPONENTS_PATHS.kitchenSink.selectionControls,
    data: { breadcrumb: 'Selection controls' },
    loadComponent: () =>
      import('./selection-controls/selection-controls-page.component').then(
        (m) => m.SelectionControlsPageComponent,
      ),
  },
  {
    path: COMPONENTS_PATHS.kitchenSink.pickers,
    data: { breadcrumb: 'Pickers' },
    loadComponent: () => import('./pickers/pickers-page.component').then((m) => m.PickersPageComponent),
  },
  {
    path: COMPONENTS_PATHS.kitchenSink.cardsChips,
    data: { breadcrumb: 'Cards & chips' },
    loadComponent: () =>
      import('./cards-chips/cards-chips-page.component').then((m) => m.CardsChipsPageComponent),
  },
  {
    path: COMPONENTS_PATHS.kitchenSink.layoutNav,
    data: { breadcrumb: 'Layout & navigation' },
    loadComponent: () => import('./layout-nav/layout-nav-page.component').then((m) => m.LayoutNavPageComponent),
  },
  {
    path: COMPONENTS_PATHS.kitchenSink.overlays,
    data: { breadcrumb: 'Overlays' },
    loadComponent: () => import('./overlays/overlays-page.component').then((m) => m.OverlaysPageComponent),
  },
];
