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

  it('applies vnv-chart: 40 sensors, chart view, all QIs, baseline and OOS selected', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart', data) as ResolvedVnvState);
    expect(store.headerSummary()).toEqual({ name: '241-AN-WSTA-102-TI', sensorCount: 40 });
    expect(store.result()!.sensors.length).toBe(40);
    expect(store.view()).toBe('chart');
    expect(store.baselineSensorId()).toBe(store.result()!.sensors[0].id);
    expect(store.outOfService().length).toBeGreaterThan(0);
    expect(store.atFullRange()).toBe(true);
  });

  it('applies vnv-chart-sensors-hidden', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart-sensors-hidden', data) as ResolvedVnvState);
    expect(store.hiddenSensorIds().size).toBe(30);
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
    expect(store.result()!.sensors.length).toBe(40);
    expect(store.result()!.readings.every((r) => r.timestamp >= range.start && r.timestamp < range.end + D)).toBe(true);
    expect(store.atFullRange()).toBe(true);
  });

  it('toggles sensors and clamps the window to the loaded range', async () => {
    await store.applyState(resolvePrototypeState('vnv-chart', data) as ResolvedVnvState);
    store.toggleSensor('AN102-WSTA-TI-054');
    expect(store.hiddenSensorIds().has('AN102-WSTA-TI-054')).toBe(true);
    store.toggleSensor('AN102-WSTA-TI-054');
    expect(store.hiddenSensorIds().size).toBe(0);

    const x = store.xRange();
    store.setWindow({ start: x.start - 10 * D, end: x.end + 10 * D });
    expect(store.window()).toBeNull();
  });
});
