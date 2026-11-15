import type { ApplicationConfig } from '@angular/core';

import { provideCore } from './app/core/core.providers';
import { appRoutes } from './app.routes';
import { environment } from './environments/environment';

/**
 * Bootstrap configuration. Provider composition belongs to `provideCore()` so
 * global setup has a single home; routes and environment are passed in because
 * `core/` may not depend on the bootstrap files.
 */
export const appConfig: ApplicationConfig = {
  providers: [provideCore({ routes: appRoutes, environment })],
};
