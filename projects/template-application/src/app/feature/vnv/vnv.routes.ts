import type { Routes } from '@angular/router';

/** VNV. Phases 3–5 build the page. */
export const vnvRoutes: Routes = [
  { path: '', loadComponent: () => import('./vnv-page/vnv-page.component').then((m) => m.VnvPageComponent) },
];
