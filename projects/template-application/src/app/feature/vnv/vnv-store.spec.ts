import { TestBed } from '@angular/core/testing';
import { buildTestIllDataset, buildTestVnvDataset } from '../../core/mock-data/testing/load-mock-sources';
import { provideTestMockData } from '../../core/mock-data/testing/provide-test-mock-data';
import { resolvePrototypeState, type ResolvedVnvState } from '../../core/prototype-state/resolve-prototype-state';
import { VnvStore } from './vnv-store';

const D = 86_400_000;

describe('VnvStore', () => {
  const data = { vnv: buildTestVnvDataset(), ill: buildTestIllDataset() };
  let store: VnvStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestMockData(), VnvStore] });
    store = TestBed.inject(VnvStore);
  });

  it('applies vnv-chart: the typical 6-sensor component, chart view, baseline and OOS selected', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart', data) as ResolvedVnvState);
    expect(store.headerSummary()).toEqual({ name: '241-AN-TMAC-103-TI', sensorCount: 6 });
    expect(store.result()!.sensors.length).toBe(6);
    expect(store.view()).toBe('chart');
    expect(store.baselineSensorId()).toBe(store.result()!.sensors[0].id);
    expect(store.outOfService().length).toBeGreaterThan(0);
    expect(store.atFullRange()).toBe(true);
  });

  it('applies vnv-chart-40-sensors: the maximum the graph shows', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart-40-sensors', data) as ResolvedVnvState);
    expect(store.headerSummary()).toEqual({ name: '241-AN-WSTA-102-TI', sensorCount: 40 });
    expect(store.result()!.sensors.length).toBe(40);
  });

  it('applies vnv-chart-sensors-hidden', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart-sensors-hidden', data) as ResolvedVnvState);
    expect(store.hiddenSensorIds().size).toBe(2);
  });

  it('applies vnv-first-visit as nothing loaded', async () => {
    await store.applyState(resolvePrototypeState('vnv-first-visit', data) as ResolvedVnvState);
    expect(store.location()).toBeNull();
    expect(store.headerSummary()).toBeNull();
  });

  it('reloads the same sensors for a new range, resetting the window', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart', data) as ResolvedVnvState);
    const x = store.xRange();
    store.setWindow({ start: x.end - 30 * D, end: x.end });
    expect(store.atFullRange()).toBe(false);

    const range = { start: new Date(2026, 6, 19).getTime(), end: new Date(2026, 9, 19).getTime() };
    const pending = store.reloadRange(range);
    expect(store.loading()).toBe(true);
    await pending;
    expect(store.loading()).toBe(false);
    expect(store.result()!.sensors.length).toBe(6);
    expect(store.result()!.readings.every((r) => r.timestamp >= range.start && r.timestamp < range.end + D)).toBe(true);
    expect(store.atFullRange()).toBe(true);
  });

  it('applies vnv-chart-selection: 8 selected, popover open, window around the selection', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart-selection', data) as ResolvedVnvState);
    expect(store.selectedIds().size).toBe(8);
    expect(store.selectedReadings().length).toBe(8);
    expect(store.vnvPopoverOpen()).toBe(true);
    const w = store.effectiveWindow();
    expect(store.selectedReadings().every((r) => r.timestamp >= w.start && r.timestamp <= w.end)).toBe(true);
    expect(store.atFullRange()).toBe(false);
  });

  it('applies a review to exactly the selection, then clears it', async () => {
    await store.applyState(resolvePrototypeState('vnv-table-selection', data) as ResolvedVnvState);
    const ids = [...store.selectedIds()];
    const untouched = store.result()!.readings.find((r) => !ids.includes(r.id))!;
    store.view.set('chart');
    expect(store.selectedIds().size).toBe(8); // survives a view switch

    const pending = store.applyReview({ qi: 'Suspect', comment: 'Non pretium' });
    expect(store.applying()).toBe(true);
    await pending;

    const updated = store.result()!.readings.filter((r) => ids.includes(r.id));
    expect(updated.every((r) => r.qi === 'Suspect' && r.comment === 'Non pretium' && r.reviewer === 'Scarlett Reagan')).toBe(true);
    expect(store.result()!.readings.find((r) => r.id === untouched.id)).toEqual(untouched);
    expect(store.selectedIds().size).toBe(0);
    expect(store.vnvPopoverOpen()).toBe(false);
    expect(store.applying()).toBe(false);
  });

  it('pre-fills the form with a QI every selected reading shares', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart', data) as ResolvedVnvState);
    const good = store.result()!.readings.filter((r) => r.qi === 'Good').slice(0, 3);
    store.setSelection(good.map((r) => r.id));
    expect(store.formInitial()).toEqual({ qi: 'Good' });
    const mixed = [...good, store.result()!.readings.find((r) => r.qi === 'Suspect')!];
    store.setSelection(mixed.map((r) => r.id));
    expect(store.formInitial()).toBeNull();
  });

  it('selects all and none, and the quality filter hides rows', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart', data) as ResolvedVnvState);
    const all = store.visibleReadings().length;
    store.visibleQi.set(['Good']);
    expect(store.visibleReadings().every((r) => r.qi === 'Good')).toBe(true);
    expect(store.visibleReadings().length).toBeLessThan(all);
    store.selectAll(store.visibleReadings().map((r) => r.id), true);
    expect(store.selectedIds().size).toBe(store.visibleReadings().length);
    store.selectAll(store.visibleReadings().map((r) => r.id), false);
    expect(store.selectedIds().size).toBe(0);
  });

  it('loads a subset of a location, with the header counting what is loaded', async () => {
    const range = { start: new Date(2026, 6, 19).getTime(), end: new Date(2026, 9, 19).getTime() };
    const pending = store.load('241-AN-WST-104-TI', range, ['AN104-WST-TI-038', 'AN104-WST-TI-036']);
    expect(store.loading()).toBe(true);
    await pending;
    expect(store.headerSummary()).toEqual({ name: '241-AN-WST-104-TI', sensorCount: 2 });
    expect(store.loadedSensorIds()).toEqual(['AN104-WST-TI-036', 'AN104-WST-TI-038']); // location order
    expect(store.result()!.sensors.map((s) => s.id)).toEqual(['AN104-WST-TI-036', 'AN104-WST-TI-038']);
    expect(store.loadedRange()).toEqual(range);
  });

  it('gives the Load sensors form its tree and sensor index', async () => {
    await store.loadPickerData();
    // The real AN tree (equipment → tank → component); only TI components have sensors.
    expect(store.farm()!.groups.map((g) => g.id)).toEqual(['241-AN-Other', '241-AN-TMAC', '241-AN-VTA', '241-AN-VTP', '241-AN-WST', '241-AN-WSTA']);
    const wsta = store.farm()!.groups.find((g) => g.id === '241-AN-WSTA')!;
    expect(wsta.tanks[0]).toEqual({ id: '241-AN-WSTA-101', tank: '101', locationIds: ['241-AN-01C', '241-AN-WSTA-101-LDI', '241-AN-WSTA-101-TI'] });
    expect(wsta.locations.find((l) => l.id === '241-AN-01C')).toMatchObject({ type: 'C', tank: '101', sensorIds: [] });
    // 7 TMAC + 7 WST + 6 WSTA TI components with 6 sensors, plus the 40 in 241-AN-WSTA-102-TI.
    expect(store.sensorIndex().length).toBe(20 * 6 + 40);
  });

  it('passes a load-form fixture to the form and shows its dates', async () => {
    await store.applyState(resolvePrototypeState('vnv-load-form-no-data', data) as ResolvedVnvState);
    expect(store.loadFormOpen()).toBe(true);
    expect(store.loadFormInit()).toMatchObject({ locationId: '241-AN-TMAC-103-TI', filters: [{ kind: 'type', value: 'TI' }], showNoData: true });
    expect(store.range()).toEqual({ start: new Date(2026, 6, 19).getTime(), end: new Date(2026, 9, 19).getTime() });
    expect(store.loadedRange().start).toBe(new Date(2025, 0, 1).getTime()); // Cancel goes back to this
  });

  it('shows one reading per sensor per day (nearest 12:00) unless Show all data is on', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart', data) as ResolvedVnvState);
    expect(store.showAllData()).toBe(false);
    const daily = store.shownReadings();
    const days = new Set(daily.map((r) => `${r.sensorId}|${new Date(r.timestamp).toDateString()}`));
    expect(days.size).toBe(daily.length);
    expect(daily.length).toBeLessThan(store.result()!.readings.length);
    store.showAllData.set(true);
    expect(store.shownReadings().length).toBe(store.result()!.readings.length);
  });

  it('selects every shown reading in the current window', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart', data) as ResolvedVnvState);
    const w = { start: new Date(2026, 9, 1).getTime(), end: new Date(2026, 9, 8).getTime() };
    store.setWindow(w);
    store.toggleSensor('AN103-TMAC-TI-U1-RJA');
    store.selectShown();
    const selected = store.selectedReadings();
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.every((r) => r.timestamp >= w.start && r.timestamp <= w.end && r.sensorId !== 'AN103-TMAC-TI-U1-RJA')).toBe(true);
    expect(selected.length).toBe(store.visibleReadings().filter((r) => r.timestamp >= w.start && r.timestamp <= w.end).length);
  });

  it('toggles sensors and clamps the window to the loaded range', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart', data) as ResolvedVnvState);
    store.toggleSensor('AN103-TMAC-TI-U1-RJA');
    expect(store.hiddenSensorIds().has('AN103-TMAC-TI-U1-RJA')).toBe(true);
    store.toggleSensor('AN103-TMAC-TI-U1-RJA');
    expect(store.hiddenSensorIds().size).toBe(0);

    const x = store.xRange();
    store.setWindow({ start: x.start - 10 * D, end: x.end + 10 * D });
    expect(store.window()).toBeNull();
  });
});
