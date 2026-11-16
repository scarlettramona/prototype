import { computed, DOCUMENT, inject, Injectable } from '@angular/core';
import { ThemeService } from '../theme/theme.service';
import { SERIES_COLORS } from './chart-palette';

/**
 * The resolved Pluto colours a chart theme needs. ECharts draws on a canvas, so
 * it can't use `var(--…)`; these are read from the live tokens instead.
 */
export interface PlutoChartTokens {
  surfaceContainer: string;
  surfaceContainerLowest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  primary: string;
}

const TOKEN_VARS: Record<keyof PlutoChartTokens, string> = {
  surfaceContainer: '--mat-sys-surface-container',
  surfaceContainerLowest: '--mat-sys-surface-container-lowest',
  onSurface: '--mat-sys-on-surface',
  onSurfaceVariant: '--mat-sys-on-surface-variant',
  outline: '--mat-sys-outline',
  outlineVariant: '--mat-sys-outline-variant',
  primary: '--mat-sys-primary',
};

/**
 * Resolves each token to an `rgb()` string by applying it to a hidden probe.
 * Reading the custom property directly isn't enough: Material emits
 * `light-dark(…)` values that only resolve once applied to a colour property.
 */
export function readPlutoChartTokens(doc: Document): PlutoChartTokens {
  const probe = doc.createElement('span');
  probe.style.display = 'none';
  doc.body.appendChild(probe);
  try {
    const out = {} as PlutoChartTokens;
    for (const [key, cssVar] of Object.entries(TOKEN_VARS) as [keyof PlutoChartTokens, string][]) {
      probe.style.color = `var(${cssVar})`;
      out[key] = getComputedStyle(probe).color;
    }
    return out;
  } finally {
    probe.remove();
  }
}

/** `rgb(r, g, b)` / `rgba(…)` → the same colour at `alpha`. */
export function withAlpha(rgb: string, alpha: number): string {
  const parts = rgb.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return rgb;
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
}

/** The `pluto-dark` / `pluto-light` ECharts theme, built from the Pluto tokens. */
export function buildPlutoChartTheme(t: PlutoChartTokens): Record<string, unknown> {
  const axis = {
    axisLine: { show: true, lineStyle: { color: t.outlineVariant } },
    axisTick: { show: true, lineStyle: { color: t.outlineVariant } },
    axisLabel: { color: t.onSurfaceVariant },
    nameTextStyle: { color: t.onSurfaceVariant },
    splitLine: { show: true, lineStyle: { color: withAlpha(t.outlineVariant, 0.45) } },
    splitArea: { show: false },
  };

  return {
    color: [...SERIES_COLORS],
    backgroundColor: 'transparent',
    textStyle: { color: t.onSurfaceVariant, fontFamily: 'Roboto' },
    title: { textStyle: { color: t.onSurface }, subtextStyle: { color: t.onSurfaceVariant } },
    legend: { textStyle: { color: t.onSurface } },
    categoryAxis: axis,
    valueAxis: axis,
    timeAxis: axis,
    logAxis: axis,
    tooltip: {
      backgroundColor: t.surfaceContainerLowest,
      borderColor: t.outline,
      borderWidth: 1,
      textStyle: { color: t.onSurface },
      axisPointer: {
        lineStyle: { color: t.outline },
        crossStyle: { color: t.outline },
      },
    },
    axisPointer: {
      lineStyle: { color: t.outline },
      crossStyle: { color: t.outline },
      label: { backgroundColor: t.surfaceContainerLowest, color: t.onSurface, borderColor: t.outline, borderWidth: 1 },
    },
    dataZoom: {
      borderColor: t.outlineVariant,
      backgroundColor: 'transparent',
      fillerColor: withAlpha(t.primary, 0.12),
      handleColor: t.primary,
      moveHandleStyle: { color: t.outlineVariant },
      textStyle: { color: t.onSurfaceVariant },
      dataBackground: {
        lineStyle: { color: t.outline, opacity: 0.6 },
        areaStyle: { color: t.outline, opacity: 0.1 },
      },
      selectedDataBackground: {
        lineStyle: { color: t.primary, opacity: 0.8 },
        areaStyle: { color: t.primary, opacity: 0.15 },
      },
    },
    brush: {
      brushStyle: { color: withAlpha(t.primary, 0.12), borderColor: t.primary, borderWidth: 1 },
    },
  };
}

/** The current ECharts theme object. Bind it to `[theme]` on every chart. */
@Injectable({ providedIn: 'root' })
export class PlutoChartThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly themeService = inject(ThemeService);

  /** Name for logs and tests: `pluto-dark` or `pluto-light`. */
  readonly name = computed(() => `pluto-${this.themeService.theme()}`);

  /** The resolved token colours, for options that need them directly (loading, export background). */
  readonly tokens = computed(() => {
    this.themeService.theme(); // dependency: the <html> class has flipped by now
    return readPlutoChartTokens(this.document);
  });

  /** Rebuilt when the app theme toggles, so charts re-render in the new colours. */
  readonly theme = computed(() => buildPlutoChartTheme(this.tokens()));
}
