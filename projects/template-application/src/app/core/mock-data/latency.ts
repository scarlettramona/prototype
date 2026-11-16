import { InjectionToken } from '@angular/core';
import { MOCK_DATA_CONFIG } from './mock-data.config';

/** Returns a delay in ms for the next mock call. Tests provide `() => 0`. */
export const MOCK_LATENCY = new InjectionToken<() => number>('MOCK_LATENCY', {
  providedIn: 'root',
  factory: () => () => {
    const { min, max } = MOCK_DATA_CONFIG.latencyMs;
    return min + Math.random() * (max - min);
  },
});

/** Resolves `value` after `ms`. */
export function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
