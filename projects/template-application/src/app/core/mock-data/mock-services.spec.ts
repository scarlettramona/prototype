import { TestBed } from '@angular/core/testing';
import { IllMockService } from '../ill/ill-mock.service';
import { analysisState } from '../ill/ill.models';
import { VnvMockService } from '../vnv/vnv-mock.service';
import { endOfDay, parseUsDate } from './dates';
import { delay, MOCK_LATENCY } from './latency';
import { MOCK_DATA_CONFIG } from './mock-data.config';
import { provideTestMockData } from './testing/provide-test-mock-data';

describe('Mock services', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: provideTestMockData() }));

  it('default latency is 300–800 ms', () => {
    TestBed.resetTestingModule();
    const latency = TestBed.inject(MOCK_LATENCY);
    for (let i = 0; i < 50; i++) {
      const ms = latency();
      expect(ms).toBeGreaterThanOrEqual(300);
      expect(ms).toBeLessThanOrEqual(800);
    }
  });

  it('delay() waits before resolving', async () => {
    const start = performance.now();
    await delay(30, null);
    expect(performance.now() - start).toBeGreaterThanOrEqual(25);
  });

  describe('VNV', () => {
    const range = { start: parseUsDate('10/1/2026'), end: endOfDay(parseUsDate('11/12/2026')) };

    it('loads readings for a range, with reference data', async () => {
      const service = TestBed.inject(VnvMockService);
      const result = await service.load({ ...range, sensorIds: ['AN102-WSTA-TI-054', 'AN102-WSTA-TI-060'] });
      expect(result.sensors.map((s) => s.id)).toEqual(['AN102-WSTA-TI-054', 'AN102-WSTA-TI-060']);
      expect(result.readings.every((r) => r.timestamp >= range.start && r.timestamp <= range.end)).toBe(true);
      expect(result.baselines.length).toBe(2);
      expect(result.outOfService.every((o) => o.sensorId === 'AN102-WSTA-TI-060')).toBe(true);
    });

    it('applies a review in memory', async () => {
      const service = TestBed.inject(VnvMockService);
      const before = await service.load({ ...range, sensorIds: ['AN102-WSTA-TI-054'] });
      const ids = before.readings.slice(0, 3).map((r) => r.id);
      const updated = await service.applyReview({ readingIds: ids, qi: 'Suspect', comment: 'Non pretium' });
      expect(updated.length).toBe(3);
      const after = await service.load({ ...range, sensorIds: ['AN102-WSTA-TI-054'] });
      const changed = after.readings.filter((r) => ids.includes(r.id));
      expect(changed.every((r) => r.qi === 'Suspect' && r.comment === 'Non pretium')).toBe(true);
      expect(changed.every((r) => r.reviewer === MOCK_DATA_CONFIG.currentUser)).toBe(true);
    });
  });

  describe('ILL', () => {
    it('filters the library by date, QI and analysis', async () => {
      const service = TestBed.inject(IllMockService);
      const query = { start: parseUsDate('7/19/2026'), end: parseUsDate('10/19/2026'), wellIds: [], qi: 'Any', analysis: 'Unsaved' } as const;
      const results = await service.searchScans({ ...query, wellIds: [] });
      expect(results.length).toBeGreaterThan(0);
      // Unsaved = never saved or re-run since. The stored data has no unsaved results.
      expect(results.every((s) => !s.analysis.saved || !!s.analysis.unsaved)).toBe(true);
      expect(results.some((s) => !!s.analysis.unsaved)).toBe(false);
      expect(results.some((s) => 'points' in s)).toBe(false);
      const good = await service.searchScans({ ...query, wellIds: [], analysis: 'Any', qi: 'Good' });
      expect(good.every((s) => s.qi === 'Good')).toBe(true);
    });

    it('runs, saves and discards analyses in memory', async () => {
      const service = TestBed.inject(IllMockService);
      const scans = await service.getWellScans(MOCK_DATA_CONFIG.ill.focusWell.id);
      const none = scans.find((s) => analysisState(s.analysis) === 'none')!;
      const [preset] = await service.getPresets();

      expect(preset.savedBy).toBe(MOCK_DATA_CONFIG.ill.defaultPreset.savedBy);
      const run = await service.runAnalysis(none.id, preset.parameters);
      expect(analysisState(run.analysis)).toBe('unsaved');
      expect(run.analysis.unsaved!.results.calculatedIll).toBeGreaterThan(128);

      const saved = await service.saveAnalysis(none.id);
      expect(analysisState(saved.analysis)).toBe('saved');
      expect(saved.analysis.saved!.savedBy).toBe(MOCK_DATA_CONFIG.currentUser);

      const edited = structuredClone(preset.parameters);
      edited.illMethod.normalUpperRange = 20;
      const rerun = await service.runAnalysis(none.id, edited);
      expect(analysisState(rerun.analysis)).toBe('saved+unsaved');
      expect(rerun.analysis.unsaved!.results.calculatedIll).not.toBe(rerun.analysis.saved!.results.calculatedIll);

      const discarded = await service.discardAnalysis(none.id);
      expect(analysisState(discarded.analysis)).toBe('saved');
      const [reloaded] = await service.getScans([none.id]);
      expect(analysisState(reloaded.analysis)).toBe('saved');
    });

    it('flags the reference scan on reads and moves it with setReferenceScan', async () => {
      const service = TestBed.inject(IllMockService);
      const wellId = MOCK_DATA_CONFIG.ill.focusWell.id;
      const scans = await service.getWellScans(wellId);
      expect(scans.filter((s) => s.reference)).toHaveLength(1);
      const next = scans.find((s) => !s.reference)!;
      const after = await service.setReferenceScan(next.id);
      expect(after.filter((s) => s.reference).map((s) => s.id)).toEqual([next.id]);
      expect((await service.getReferenceScan(wellId))!.id).toBe(next.id);
    });

    it('saves a preset as the new default, with a new saved on / by', async () => {
      const service = TestBed.inject(IllMockService);
      const [before] = await service.getPresets();
      const params = structuredClone(before.parameters);
      params.miscellaneous.markerDepth = 420;
      const [after] = await service.savePreset(params);
      expect(after.parameters.miscellaneous.markerDepth).toBe(420);
      expect(after.savedBy).toBe(MOCK_DATA_CONFIG.currentUser);
      expect(after.savedAt).toBeGreaterThan(before.savedAt);
      expect((await service.getPresets())[0].parameters.miscellaneous.markerDepth).toBe(420);
    });

    it('sets scan-level QI and comments', async () => {
      const service = TestBed.inject(IllMockService);
      const [scan] = await service.getWellScans(MOCK_DATA_CONFIG.ill.focusWell.id);
      await service.reviewScans({ scanIds: [scan.id], qi: 'Suspect', scanComment: 'Sit amet' });
      const [after] = await service.getScans([scan.id]);
      expect(after.qi).toBe('Suspect');
      expect(after.scanComment).toBe('Sit amet');
    });
  });
});
