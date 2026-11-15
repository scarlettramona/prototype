import type { EnvironmentProviders } from '@angular/core';
import { makeEnvironmentProviders } from '@angular/core';

import type { Environment } from './environment.token';
import { ENVIRONMENT } from './environment.token';

/** Publishes the build-time environment through the `ENVIRONMENT` token. */
export function provideAppConfiguration(environment: Environment): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: ENVIRONMENT, useValue: environment }]);
}
