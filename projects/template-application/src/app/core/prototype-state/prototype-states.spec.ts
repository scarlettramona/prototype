import { analysisState } from '../ill/ill.models';
import { buildTestIllDataset, buildTestVnvDataset } from '../mock-data/testing/load-mock-sources';
import { PROTOTYPE_STATE_NAMES } from './prototype-states';
import { resolvePrototypeState } from './resolve-prototype-state';

describe('Prototype states', () => {
  const data = { vnv: buildTestVnvDataset(), ill: buildTestIllDataset() };

  it('includes every state the phase briefs name', () => {
    expect(PROTOTYPE_STATE_NAMES).toEqual(
      expect.arrayContaining([
        'vnv-first-visit',
        'vnv-chart',
        'vnv-chart-load-form-open',
        'vnv-chart-sensors-hidden',
        'vnv-chart-selection',
        'vnv-table',
        'vnv-table-selection',
        'ill-library-empty',
        'ill-library-results',
        'ill-all-scans',
        'ill-scan-saved',
        'ill-scan-unsaved-rerun',
        'ill-scan-no-analysis',
        'ill-scan-first-run-unsaved',
        'ill-scans-popover',
      ]),
    );
  });

  it.each(PROTOTYPE_STATE_NAMES)('%s resolves against the generated data', (name) => {
    const state = resolvePrototypeState(name, data);
    expect(state.name).toBe(name);
    expect(state.route[0]).toBe('/');
  });

  it('resolves selections and analysis states to concrete ids', () => {
    const chart = resolvePrototypeState('vnv-chart-selection', data);
    expect(chart.module === 'vnv' && chart.selectedReadingIds.length).toBe(8);

    const rerun = resolvePrototypeState('ill-scan-unsaved-rerun', data);
    if (rerun.module !== 'ill' || rerun.screen !== 'focus') throw new Error('wrong state shape');
    // The re-run happens when the store applies the state; the stored scan is saved.
    const scan = data.ill.scans.get(rerun.activeTab)!;
    expect(rerun.run).toBe(true);
    expect(analysisState(scan.analysis)).toBe('saved');
    expect(rerun.scanIds.length).toBe(8);
  });
});
