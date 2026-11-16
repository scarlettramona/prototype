/** Small numeric helpers shared by the mock generators and the mock analysis. */

/** Arithmetic mean; 0 for an empty list. */
export function mean(values: readonly number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** Population standard deviation; 0 for an empty list. */
export function std(values: readonly number[]): number {
  const m = mean(values);
  return values.length ? Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length) : 0;
}

/** `value` rounded to `digits` decimal places. */
export function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
