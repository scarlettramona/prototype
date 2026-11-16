import type { Reading } from './vnv.models';

/**
 * The VNV default view (Scarlett, 2026-11-16): one reading per sensor per day,
 * the one nearest 12:00 (usually the noon reading). "Show all data" shows every
 * reading instead. `readings` must be sorted by sensor, then time.
 */
export function dailyReadings(readings: readonly Reading[]): Reading[] {
  const out: Reading[] = [];
  let key = '';
  let best: Reading | null = null;
  let bestDistance = Infinity;
  for (const r of readings) {
    const d = new Date(r.timestamp);
    const k = `${r.sensorId}|${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const distance = Math.abs(r.timestamp - new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime());
    if (k !== key) {
      if (best) out.push(best);
      key = k;
      best = r;
      bestDistance = distance;
    } else if (distance < bestDistance) {
      best = r;
      bestDistance = distance;
    }
  }
  if (best) out.push(best);
  return out;
}
