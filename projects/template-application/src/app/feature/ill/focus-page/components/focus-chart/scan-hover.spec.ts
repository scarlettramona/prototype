import { describe, expect, it } from 'vitest';
import { hitScan, type HoverCandidate } from './scan-hover';

// Identity mapping: depth is x, counts is y.
const toPixel = (p: readonly [number, number]) => p;
const line = (id: string, counts: number): HoverCandidate => ({
  id,
  points: [10, 8, 6, 4, 2, 0].map((d) => ({ depthIn: d, counts })),
});

describe('hitScan', () => {
  it('finds the line under the pointer', () => {
    const hit = hitScan([line('a', 100), line('b', 50)], [5, 52], 5, 2, toPixel);
    expect(hit?.id).toBe('b');
    expect(hit?.distance).toBeCloseTo(2);
  });

  it('returns null when no line is within the tolerance', () => {
    expect(hitScan([line('a', 100), line('b', 50)], [5, 75], 5, 2, toPixel)).toBeNull();
  });

  it('measures to the segment, so steep spikes count between points', () => {
    const spike: HoverCandidate = {
      id: 's',
      points: [
        { depthIn: 6, counts: 0 },
        { depthIn: 4, counts: 100 },
      ],
    };
    expect(hitScan([spike], [5, 50], 5, 2, toPixel)?.id).toBe('s');
  });

  it('prefers the focused scan on a near tie', () => {
    const hit = hitScan([line('a', 50), line('b', 51)], [5, 50.6], 5, 2, toPixel, 8, 'b');
    expect(hit?.id).toBe('b');
  });
});
