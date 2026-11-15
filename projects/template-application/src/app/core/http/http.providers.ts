import type { EnvironmentProviders } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

/**
 * HTTP infrastructure. Interceptors that apply app-wide — auth headers,
 * error mapping, correlation IDs — are registered here with
 * `withInterceptors()` so every caller gets them.
 */
export function provideHttpInfrastructure(): EnvironmentProviders {
  return provideHttpClient();
}
