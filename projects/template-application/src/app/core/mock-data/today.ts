import { InjectionToken } from '@angular/core';
import { addDays, parseUsDate, startOfDay } from './dates';
import { MOCK_DATA_CONFIG } from './mock-data.config';

/**
 * "Today" for the mock data: the generated data ends today and default date
 * ranges count back from it. The app uses the real date; tests provide
 * `MOCK_DATA_ANCHOR` so their results never depend on the day they run.
 */
export const MOCK_TODAY = new InjectionToken<number>('MOCK_TODAY', {
  providedIn: 'root',
  factory: () => startOfDay(Date.now()),
});

/**
 * The day the mock data's fixed dates were laid out against. ILL scan dates
 * move forward by the days between this and today, so they keep their
 * spacing and stay recent.
 */
export const MOCK_DATA_ANCHOR = parseUsDate(MOCK_DATA_CONFIG.anchorDate);

/** Whole calendar days from `from` to `to` (DST-safe). */
export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86_400_000);
}

/** Default date ranges: the last 90 days, ending today. */
export const DEFAULT_RANGE_DAYS = 90;

/** The default date range on VNV and the ILL Scan library: `DEFAULT_RANGE_DAYS` back from `today`, to today. */
export function defaultDateRange(today: number): { start: number; end: number } {
  const end = startOfDay(today);
  return { start: addDays(end, -DEFAULT_RANGE_DAYS), end };
}
