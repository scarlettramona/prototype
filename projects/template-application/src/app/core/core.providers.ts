import type { EnvironmentProviders } from '@angular/core';
import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import type { Routes } from '@angular/router';

import { provideAppConfiguration } from './config/config.providers';
import type { Environment } from './config/environment.token';
import { provideDateHandling } from './date/date.providers';
import { provideHttpInfrastructure } from './http/http.providers';
import { provideIcons } from './icons/icons.providers';
import { provideRouting } from './routing/routing.providers';

export type CoreConfig = {
  /** Top-level routes, owned by the bootstrap files. */
  routes: Routes;
  /** Build-time environment, owned by the bootstrap files. */
  environment: Environment;
};

/**
 * Everything the app needs app-wide or at startup, composed from one function
 * per concern so this does not become a dumping ground.
 *
 * Route- and feature-scoped services are *not* registered here: they belong in
 * the `providers` of the route that owns them, which keeps their instance and
 * their bundle inside that feature.
 */
export function provideCore(config: CoreConfig): EnvironmentProviders[] {
  return [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideAppConfiguration(config.environment),
    provideRouting(config.routes),
    provideHttpInfrastructure(),
    provideIcons(),
    provideDateHandling(),
  ];
}
