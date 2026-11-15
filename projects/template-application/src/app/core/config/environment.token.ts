import { InjectionToken } from '@angular/core';

export type Environment = {
  /** Origin the app is served from. */
  domain: string;
  /** Base URL every API call is built from. */
  apiBaseUrl: string;
};

export const ENVIRONMENT = new InjectionToken<Environment>('Environment Configuration');
