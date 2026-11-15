import type { EnvironmentProviders } from '@angular/core';
import { makeEnvironmentProviders } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';

/** Date adapter used by every Material date control. */
export function provideDateHandling(): EnvironmentProviders {
  return makeEnvironmentProviders([provideNativeDateAdapter()]);
}
