import { TestBed } from '@angular/core/testing';
import { analysisState } from '../../../core/ill/ill.models';
import { buildTestIllDataset } from '../../../core/mock-data/testing/load-mock-sources';
import { provideTestMockData } from '../../../core/mock-data/testing/provide-test-mock-data';
import type { PrototypeStateName } from '../../../core/prototype-state/prototype-states';
import { resolvePrototypeState, type ResolvedIllFocusState } from '../../../core/prototype-state/resolve-prototype-state';
import { ALL_TAB, IllFocusStore } from './ill-focus-store';

describe('IllFocusStore', () => {
  const data = { ill: buildTestIllDataset() };
  const state = (name: PrototypeStateName) => resolvePrototypeState(name, data) as ResolvedIllFocusState;
  let store: IllFocusStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestMockData(), IllFocusStore] });
    store = TestBed.inject(IllFocusStore);
  });

  it('applies every focus fixture', async () => {
    await store.applyState(state('ill-all-scans'));
    expect(store.active()).toBe(ALL_TAB);
    expect(store.focused()).toBeNull();
    expect(store.openScans().length).toBeGreaterThan(1);

    for (const [name, want] of [
      ['ill-scan-saved', 'saved'],
      ['ill-scan-unsaved-rerun', 'saved+unsaved'],
      ['ill-scan-no-analysis', 'none'],
      ['ill-scan-first-run-unsaved', 'unsaved'],
    ] as const) {
      await store.applyState(state(name));
      expect(analysisState(store.focused()!.analysis)).toBe(want);
    }

    await store.applyState(state('ill-scan-zoomed'));
    expect(store.window()).toEqual({ start: 10, end: 150 });
    expect([...store.edited()]).toEqual(['illMethod.normalLowerRange']);

    await store.applyState(state('ill-scans-popover'));
    expect(store.legendOpen()).toBe(true);
    expect(store.visibleScans().length).toBe(2);
  });

  it('keeps every tile read-only until Edit; Revert, Run and Save as default return it to read mode', async () => {
    await store.applyState(state('ill-scan-saved'));
    expect(store.editingGroups().size).toBe(0);
    expect(store.selectedPreset()?.savedBy).toBeTruthy();

    store.editGroup('calculationBaseline');
    store.editGroup('markerMethod');
    store.setField('calculationBaseline', 'baselineValue', 140);
    expect([...store.editingGroups()].sort()).toEqual(['calculationBaseline', 'markerMethod']);
    store.revert('calculationBaseline');
    expect(store.editingGroups().has('calculationBaseline')).toBe(false);
    expect(store.edited().size).toBe(0);

    store.setField('markerMethod', 'counts', 950);
    await store.run();
    expect(store.editingGroups().size).toBe(0);
    expect([...store.edited()]).toEqual(['markerMethod.counts']);
    expect(store.focused()!.analysis.unsaved).toBeDefined();

    await store.saveAsDefault();
    expect(store.edited().size).toBe(0);
    expect(store.defaultPreset()!.parameters.markerMethod.counts).toBe(950);
    expect(store.defaultPreset()!.savedAt).toBeGreaterThan(0);
  });

  it('shows saved on / by only once the analysis is saved', async () => {
    await store.applyState(state('ill-scan-first-run-unsaved'));
    const s = store.focused()!;
    expect(s.analysis.saved).toBeUndefined();
    expect(s.analysis.unsaved).toBeDefined();
    await store.save();
    expect(store.focused()!.analysis.saved?.savedBy).toBeTruthy();
    expect(store.focused()!.analysis.unsaved).toBeUndefined();
  });

  it('shares the zoom window across tabs, and Reset clears it', async () => {
    await store.applyState(state('ill-scan-saved'));
    store.setWindow({ start: 200, end: 20 });
    expect(store.window()).toEqual({ start: 20, end: 200 });
    store.select(ALL_TAB);
    expect(store.window()).toEqual({ start: 20, end: 200 });
    store.setWindow(null);
    expect(store.atFullRange()).toBe(true);
  });

  it('runs, then saves: dirty until saved, primary action follows', async () => {
    await store.applyState(state('ill-scan-saved'));
    const id = store.active();
    expect(store.primaryAction()).toBe('run');
    store.setField('illMethod', 'normalUpperRange', 14);
    expect(store.edited().has('illMethod.normalUpperRange')).toBe(true);

    await store.run();
    expect(store.dirty(id)).toBe(true);
    expect(store.primaryAction()).toBe('save');

    await store.save();
    expect(store.dirty(id)).toBe(false);
    expect(store.focused()!.analysis.saved!.parameters.illMethod.normalUpperRange).toBe(14);
    expect(store.edited().size).toBe(0);
  });

  it('discards unsaved results', async () => {
    await store.applyState(state('ill-scan-first-run-unsaved'));
    const id = store.active();
    expect(store.dirty(id)).toBe(true);
    await store.discard();
    expect(analysisState(store.focused()!.analysis)).toBe('none');
    expect(store.dirty(id)).toBe(false);
  });

  it('counts an edited review as unsaved work and saves it', async () => {
    await store.applyState(state('ill-scan-saved'));
    const id = store.active();
    store.setReview({ qi: 'Suspect', scanComment: 'Sit amet' });
    expect(store.dirty(id)).toBe(true);
    await store.save();
    expect(store.focused()).toMatchObject({ qi: 'Suspect', scanComment: 'Sit amet' });
    expect(store.dirty(id)).toBe(false);
  });

  it('closes and reopens tabs', async () => {
    await store.applyState(state('ill-scan-saved'));
    const id = store.active();
    const count = store.openIds().length;
    store.close(id);
    expect(store.openIds().length).toBe(count - 1);
    expect(store.active()).not.toBe(id);
    expect(store.closedScans().map((s) => s.id)).toEqual([id]);
    store.open(id);
    expect(store.openIds().length).toBe(count);
    expect(store.active()).toBe(id);
  });

  it('hides scans, but never the focused one', async () => {
    await store.applyState(state('ill-scan-saved'));
    const focus = store.active();
    const other = store.openIds().find((x) => x !== focus)!;
    store.setHidden(other, true);
    store.setHidden(focus, true);
    expect(store.visibleScans().some((s) => s.id === other)).toBe(false);
    expect(store.visibleScans().some((s) => s.id === focus)).toBe(true);
    store.setAllVisible(false);
    expect(store.visibleScans().map((s) => s.id)).toEqual([focus]);
    store.setAllVisible(true);
    expect(store.visibleScans().length).toBe(store.openIds().length);
  });
});
