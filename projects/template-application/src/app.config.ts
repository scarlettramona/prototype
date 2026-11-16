import type { ApplicationConfig } from '@angular/core';
import { inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideNativeDateAdapter, type MatDateFormats } from '@angular/material/core';
import { MAT_ICON_DEFAULT_OPTIONS, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';

import { PrototypeStateService } from './app/core/prototype-state/prototype-state.service';
import { appRoutes } from './app.routes';

/** Dates show as MM/DD/YYYY, as in the designs. */
const DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: null },
  display: {
    dateInput: { year: 'numeric', month: '2-digit', day: '2-digit' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding(), withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(),
    provideNativeDateAdapter(DATE_FORMATS),
    provideEchartsCore({ echarts: () => import('./app/core/charts/echarts').then((m) => m.echarts) }),
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-rounded' } },
    provideAppInitializer(() => {
      const logo = inject(DomSanitizer).bypassSecurityTrustResourceUrl('logo-small.svg');
      inject(MatIconRegistry).addSvgIcon('logo-small', logo);
    }),
    // Start watching ?state= from the first navigation.
    provideAppInitializer(() => void inject(PrototypeStateService)),
  ],
};
