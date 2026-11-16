import type { Routes } from '@angular/router';

/** Dev-only pages. Registered only in dev builds (see `app.routes.ts`). */
export const devRoutes: Routes = [
  { path: 'data', loadComponent: () => import('./data-proof/data-proof.component').then((m) => m.DataProofComponent) },
  {
    path: 'gallery',
    loadComponent: () => import('./component-gallery/component-gallery.component').then((m) => m.ComponentGalleryComponent),
  },
];
