import { MOCK_DATA_CONFIG } from '../mock-data/mock-data.config';
import { parseCsvRecords } from '../mock-data/csv';
import { buildTestIllDataset, loadIllSource, readMockFile } from '../mock-data/testing/load-mock-sources';
import { analysisState } from './ill.models';
import { buildIllDataset } from './ill-generator';

describe('ILL generator', () => {
  const ds = buildTestIllDataset();
  const focus = MOCK_DATA_CONFIG.ill.focusWell;

  it('keeps the real scan’s 513 points unchanged', () => {
    const csv = parseCsvRecords(readMockFile('ill/ill-scans.csv'));
    const real = [...ds.scans.values()].filter((s) => s.real);
    expect(real.length).toBe(1);
    expect(real[0].points.length).toBe(513);
    real[0].points.forEach((p, i) => {
      expect(p.depthIn).toBe(Number(csv[i]['corrected_depth_in']));
      expect(p.counts).toBe(Number(csv[i]['corrected_counts']));
    });
    expect(real[0].qi).toBeNull();
  });

  it('gives the focus well 8 scans with the configured analysis-state spread', () => {
    const scans = ds.wells.get(focus.id)!.scanIds.map((id) => ds.scans.get(id)!);
    expect(scans.length).toBe(8);
    expect(scans.map((s) => analysisState(s.analysis))).toEqual([...focus.analysisStates]);
    expect(new Set(scans.map((s) => s.colorIndex)).size).toBe(8);
    // Stored data is saved or none: unsaved results only come from running an analysis.
    expect(new Set(['saved', 'none'])).toEqual(new Set(scans.map((s) => analysisState(s.analysis))));
    expect([...ds.scans.values()].some((s) => s.analysis.unsaved)).toBe(false);
  });

  it('places the calculated ILL near the rise (~134–136 in)', () => {
    for (const scan of ds.scans.values()) {
      const r = scan.analysis.saved?.results ?? scan.analysis.unsaved?.results;
      if (!r) continue;
      expect(r.rawIll).toBeGreaterThan(128);
      expect(r.rawIll).toBeLessThan(142);
    }
  });

  it('derives profiles with the same shape and point count', () => {
    for (const scan of ds.scans.values()) {
      expect(scan.points.length).toBe(513);
      const plateau = scan.points.filter((p) => p.depthIn < 110 && p.depthIn > 20);
      const trough = scan.points.filter((p) => p.depthIn > 200 && p.depthIn < 400);
      expect(Math.min(...plateau.map((p) => p.counts))).toBeGreaterThan(1000);
      expect(Math.max(...trough.map((p) => p.counts))).toBeLessThan(200);
    }
  });

  it('includes the other library wells, with scans in the library’s default range', () => {
    expect(ds.wells.size).toBe(MOCK_DATA_CONFIG.ill.wells.length + 2);
    const start = new Date(2026, 6, 19).getTime();
    const end = new Date(2026, 9, 20).getTime();
    expect([...ds.scans.values()].filter((s) => s.datetime >= start && s.datetime < end).length).toBeGreaterThan(10);
  });

  it('is deterministic', () => {
    const again = buildIllDataset(loadIllSource(), MOCK_DATA_CONFIG);
    expect([...again.scans.keys()]).toEqual([...ds.scans.keys()]);
    expect(again.scans.get(ds.wells.get(focus.id)!.scanIds[1])).toEqual(ds.scans.get(ds.wells.get(focus.id)!.scanIds[1]));
  });
});
