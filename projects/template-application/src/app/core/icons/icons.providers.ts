import type { EnvironmentProviders } from '@angular/core';
import { inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';

import { IconInitService } from './icon-init.service';

/** Registers the app's SVG icons at startup and defaults `mat-icon` to the icon font. */
export function provideIcons(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => inject(IconInitService).init()),
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-rounded' } },
  ]);
}
