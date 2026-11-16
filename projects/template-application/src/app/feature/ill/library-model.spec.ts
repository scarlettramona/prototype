import { defaultParameters } from '../../core/ill/ill-analysis';
import type { Analysis, AnalysisResults, ScanSummary } from '../../core/ill/ill.models';
import { groupByWell, matchesSearch, qiLetter, recentWells, summaryParts, valueCell, wellLabel } from './library-model';

const D = 86_400_000;
const T = new Date(2026, 9, 1).getTime();

function results(calculatedIll: number, inTolerance = true): AnalysisResults {
  return { calculatedIll, depthCorrection: 0.1, baseline: 135, stdDeviation: 0.5, inTolerance, outliers: 2, rawMarkers: 280, rawIll: calculatedIll - 0.1 };
}

const saved = { parameters: defaultParameters(), results: results(134.5), savedAt: T, savedBy: 'Arch Bence' };
const unsaved = { parameters: defaultParameters(), results: results(135.25, false), runAt: T };

function scan(wellId: string, day: number, analysis: Analysis = {}, extra: Partial<ScanSummary> = {}): ScanSummary {
  const datetime = T + day * D;
  return { id: `${wellId}|${datetime}`, wellId, datetime, colorIndex: 0, qi: 'Good', analysis, real: false, ...extra };
}

describe('Scan library model', () => {
  it('shows saved values plain, unsaved in primary, and both as two lines', () => {
    expect(valueCell({ saved }, 'calculatedIll')).toEqual({ top: '134.500', bottom: null, tone: 'saved' });
    expect(valueCell({ unsaved }, 'calculatedIll')).toEqual({ top: '135.250', bottom: null, tone: 'unsaved' });
    expect(valueCell({ saved, unsaved }, 'calculatedIll')).toEqual({ top: '135.250', bottom: '134.500', tone: 'unsaved' });
    expect(valueCell({}, 'calculatedIll')).toEqual({ top: '--', bottom: null, tone: 'saved' });
    expect(valueCell({ saved, unsaved }, 'inTolerance')).toEqual({ top: 'No', bottom: 'Yes', tone: 'unsaved' });
    expect(valueCell({ saved }, 'outliers').top).toBe('2');
  });

  it('turns QI into G / S / blank', () => {
    expect([qiLetter('Good'), qiLetter('Suspect'), qiLetter(null)]).toEqual(['G', 'S', '']);
  });

  it('marks wells with a recent scan', () => {
    const recent = recentWells([scan('A', 0), scan('B', -60)], T, 30);
    expect([...recent]).toEqual(['A']);
    expect(wellLabel('A', recent)).toBe('A *');
    expect(wellLabel('B', recent)).toBe('B');
  });

  it('summarises the collapsed form', () => {
    const q = { start: new Date(2026, 6, 19).getTime(), end: new Date(2026, 9, 19).getTime(), wellIds: [], qi: 'Any', analysis: 'Unsaved' } as const;
    expect(summaryParts({ ...q, wellIds: [] })).toEqual({ wells: 'All wells', dates: '07/19/2026 - 10/19/2026', chips: ['Unsaved'] });
    expect(summaryParts({ ...q, wellIds: ['A', 'B'], qi: 'Not set', analysis: 'Any' }).chips).toEqual(['Not set']);
  });

  it('searches well, date, analyst and comments', () => {
    const s = scan('S101 R02 N 400166', 0, { saved, analyst: 'Arch Bence' }, { scanComment: 'Non pretium' });
    expect(matchesSearch(s, 's101')).toBe(true);
    expect(matchesSearch(s, 'bence')).toBe(true);
    expect(matchesSearch(s, 'pretium')).toBe(true);
    expect(matchesSearch(s, '10/01/2026')).toBe(true);
    expect(matchesSearch(s, 'zzz')).toBe(false);
  });

  it('groups by well in name order, newest scan first', () => {
    const groups = groupByWell([scan('B', 1), scan('A', 1), scan('B', 3)]);
    expect(groups.map((g) => g.wellId)).toEqual(['A', 'B']);
    expect(groups[1].scans.map((s) => s.datetime)).toEqual([T + 3 * D, T + D]);
  });
});
