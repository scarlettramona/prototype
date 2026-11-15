import type { EnvironmentProviders } from '@angular/core';
import type { Routes } from '@angular/router';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';

/**
 * Router setup. Routes are passed in rather than imported, because `core/`
 * may not depend on the bootstrap files that own them.
 *
 * No preloading strategy is registered: a lazy feature loads when its route is
 * first activated. Turning preloading on is a recorded deviation.
 */
export function provideRouting(routes: Routes): EnvironmentProviders {
  return provideRouter(routes, withComponentInputBinding(), withRouterConfig({ paramsInheritanceStrategy: 'always' }));
}
