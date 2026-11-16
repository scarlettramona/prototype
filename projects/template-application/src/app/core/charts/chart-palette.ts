/**
 * The chart palette: the ONE place hard-coded colours are allowed (see
 * CLAUDE.md). Every chart imports series colours, dashes, amber, furniture and
 * QI symbols from here.
 */
import type { Qi } from '../qi/qi.models';

/** Series colours for sensors and scans, in assignment order. */
export const SERIES_COLORS = [
  '#4C8DF6',
  '#4CD07D',
  '#9B7BEA',
  '#F2555A',
  '#2FC4D4',
  '#D96BE0',
  '#8DB8FF',
  '#A6D96A',
  '#F08CB4',
  '#4FB8A0',
] as const;

/**
 * Dash patterns that cycle once the colours run out: solid, then three dash
 * styles. 10 colours × 4 dashes = 40 distinguishable series.
 */
export const DASH_PATTERNS: readonly (readonly number[] | 'solid')[] = ['solid', [7, 3], [2, 2], [8, 3, 2, 3]];

export const MAX_SERIES = SERIES_COLORS.length * DASH_PATTERNS.length;

/** Amber marks unsaved / changed work. Never a series colour. */
export const AMBER = '#E3B341';

/** Chart furniture: baseline bands, out-of-service bands. Use at low opacity. */
export const FURNITURE = '#8FA3C8';
export const FURNITURE_OPACITY = 0.12;

/** QI → ECharts symbol. */
export const QI_SYMBOL: Record<Qi, 'circle' | 'triangle' | 'rect' | 'diamond'> = {
  Good: 'circle',
  Suspect: 'triangle',
  Unreviewed: 'rect',
  Transcribed: 'diamond',
};

export interface SeriesStyle {
  color: string;
  /** ECharts `lineStyle.type`. */
  dash: 'solid' | number[];
}

/** Colour and dash for the series at `index` (0-based); wraps after 40. */
export function seriesStyle(index: number): SeriesStyle {
  const i = ((index % MAX_SERIES) + MAX_SERIES) % MAX_SERIES;
  const color = SERIES_COLORS[i % SERIES_COLORS.length];
  const dash = DASH_PATTERNS[Math.floor(i / SERIES_COLORS.length)];
  return { color, dash: dash === 'solid' ? 'solid' : [...dash] };
}

/** `#RRGGBB` + alpha → `rgba()`. For palette colours only. */
export function hexAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
