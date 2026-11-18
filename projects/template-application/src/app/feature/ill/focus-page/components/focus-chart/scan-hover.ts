import type { ScanPoint } from '../../../../../core/ill/ill.models';

/** Data → pixel for the depth chart: `[depthIn, counts]` → `[x, y]`. */
export type ToPixel = (point: readonly [number, number]) => readonly [number, number];

export interface HoverCandidate {
  id: string;
  points: readonly ScanPoint[];
}

export interface ScanHit {
  id: string;
  /** Pixel distance from the pointer to the scan's line. */
  distance: number;
}

/**
 * The scan line under the pointer: the nearest line segment within `tolerance`
 * pixels, or `null`. Only segments whose depth lies within `depthSpan` of the
 * pointer's depth are measured, so the cost stays small on dense scans.
 * `prefer` (the focused scan) wins a tie within 1 px, since it's drawn on top.
 */
export function hitScan(
  scans: readonly HoverCandidate[],
  pointer: readonly [number, number],
  depth: number,
  depthSpan: number,
  toPixel: ToPixel,
  tolerance = 8,
  prefer: string | null = null,
): ScanHit | null {
  let best: ScanHit | null = null;
  for (const scan of scans) {
    const pts = scan.points;
    if (pts.length === 0) continue;
    // Points run from deep to shallow (depth descending).
    const from = firstAtOrBelow(pts, depth + depthSpan);
    let distance = Infinity;
    let prev: readonly [number, number] | null = from > 0 ? toPixel([pts[from - 1].depthIn, pts[from - 1].counts]) : null;
    for (let i = from; i < pts.length; i++) {
      const p = toPixel([pts[i].depthIn, pts[i].counts]);
      distance = Math.min(distance, prev ? segmentDistance(pointer, prev, p) : Math.hypot(p[0] - pointer[0], p[1] - pointer[1]));
      prev = p;
      if (pts[i].depthIn < depth - depthSpan) break;
    }
    if (distance > tolerance) continue;
    const bonus = scan.id === prefer ? 1 : 0;
    if (!best || distance - bonus < best.distance - (best.id === prefer ? 1 : 0)) best = { id: scan.id, distance };
  }
  return best;
}

/** Index of the first point whose depth is ≤ `depth` (points sorted by depth descending). */
function firstAtOrBelow(points: readonly ScanPoint[], depth: number): number {
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].depthIn > depth) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function segmentDistance(p: readonly [number, number], a: readonly [number, number], b: readonly [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
